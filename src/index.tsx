import { watch, makeReactive, Job } from 'respondix'
import { patch, diff } from 'naivdom'
import { VNode, h as createVNode } from 'naivdom'
import * as compiler from 'tinytemplatec'

interface Dict<T> { [key: string]: T }
interface ComponentRenderFunction { (h: Function): any }
interface ComponentRenderFunctionFactory { (props: Dict<any>, children?: VNode[]): ComponentRenderFunction; }


export class Component {
	mountpoint: HTMLElement
	vroot: VNode
	props: Dict<any> = makeReactive({})
	children: VNode[]
	jobs: Job[] = [new Job(this.update.bind(this))]

	constructor(props: Dict<any> = null, children: VNode[] = null) {
		if (props) Object.assign(this.props, props)
		this.children = children || []
	}

	mount($el: HTMLElement | string) {
		if (typeof $el === 'string')
			$el = document.querySelector($el) as HTMLElement;
		console.assert($el, 'Mountpoint not found')

		if (this.vroot?.$el !== $el)
			$el.innerHTML = ''

		this.mountpoint = $el
		this.jobs[0].run()
	}

	createElement() {
		this.vroot = this.render(createVNode)
		return this.vroot.createElement() as HTMLElement
	}

	createMountpoint() {
		this.mountpoint = this.createElement()
		this.jobs[0].run()
		return this.mountpoint
	}

	update() {
		const old = this.vroot
		this.vroot = this.render(createVNode)
		if (this.mountpoint) {
			const index = this.mountpoint.parentElement ? Array.prototype.indexOf.call(this.mountpoint.parentElement.children, this.mountpoint) : -1
			const diffs = diff(old, this.vroot, index)
			if (diffs.length) patch(this.mountpoint, diffs)
		}
	}

	render: ComponentRenderFunction = function (h: Function) {
		return (
			<p>{this.constructor.name} works!</p>
		)
	}
}

export function defineComponent(factory: ComponentRenderFunctionFactory) {
	return class extends Component {
		constructor(props: Dict<any> = null, children: VNode[] = null) {
			super(props, children)
			this.render = factory(this.props, this.children)
		}
	}
}

const directives = {}

export function defineDirective(name: string, transform: Function) {
	Object.defineProperty(directives, name, {
		get() {
			return transform
		}
	})
}

defineDirective('y-for', (value, compiled) => {
	const match = /(\w+),?\s+(\w*)\s*in\s*(\S+)/.exec(value)
	if (!match) throw new Error('Invalid y-for: ' + value)
	const [, varName, indexName, arrName] = match
	console.log(arrName, varName)
	return `${arrName}.map((${varName}, ${indexName}) => ${compiled()})`
})
defineDirective('y-if', (value, compiled) => {
	return `(${value} ? ${compiled()} : void 0)`
})

const compilerDefaults = {
	h: createVNode,
	directives,
	interpolationRegex: /{{(.+)}}/g,
	dataBindingRegex: /:(\S+)/,
}
export function template(template: string, options = {}) {
	return compiler.compile(template, { ...compilerDefaults, ...options })
}

export * from 'respondix'
export * from 'naivdom'