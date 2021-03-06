
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const data = {
      columns: [
        [
          "x",
          1542412800000,
          1542499200000,
          1542585600000,
          1542672000000,
          1542758400000,
          1542844800000,
          1542931200000,
          1543017600000,
          1543104000000,
          1543190400000,
          1543276800000,
          1543363200000,
          1543449600000,
          1543536000000,
          1543622400000,
          1543708800000,
          1543795200000,
          1543881600000,
          1543968000000,
          1544054400000,
          1544140800000,
          1544227200000,
          1544313600000,
          1544400000000,
          1544486400000,
          1544572800000,
          1544659200000,
          1544745600000,
          1544832000000,
          1544918400000,
          1545004800000,
          1545091200000,
          1545177600000,
          1545264000000,
          1545350400000,
          1545436800000,
          1545523200000,
          1545609600000,
          1545696000000,
          1545782400000,
          1545868800000,
          1545955200000,
          1546041600000,
          1546128000000,
          1546214400000,
          1546300800000,
          1546387200000,
          1546473600000,
          1546560000000,
          1546646400000,
          1546732800000,
          1546819200000,
          1546905600000,
          1546992000000,
          1547078400000,
          1547164800000,
          1547251200000,
          1547337600000,
          1547424000000,
          1547510400000,
          1547596800000,
          1547683200000,
          1547769600000,
          1547856000000,
          1547942400000,
          1548028800000,
          1548115200000,
          1548201600000,
          1548288000000,
          1548374400000,
          1548460800000,
          1548547200000,
          1548633600000,
          1548720000000,
          1548806400000,
          1548892800000,
          1548979200000,
          1549065600000,
          1549152000000,
          1549238400000,
          1549324800000,
          1549411200000,
          1549497600000,
          1549584000000,
          1549670400000,
          1549756800000,
          1549843200000,
          1549929600000,
          1550016000000,
          1550102400000,
          1550188800000,
          1550275200000,
          1550361600000,
          1550448000000,
          1550534400000,
          1550620800000,
          1550707200000,
          1550793600000,
          1550880000000,
          1550966400000,
          1551052800000,
          1551139200000,
          1551225600000,
          1551312000000,
          1551398400000,
          1551484800000,
          1551571200000,
          1551657600000,
          1551744000000,
          1551830400000,
          1551916800000,
          1552003200000
        ],
        [
          "y0",
          37,
          20,
          32,
          39,
          32,
          35,
          19,
          65,
          36,
          62,
          13,
          69,
          20,
          60,
          51,
          49,
          71,
          12,
          49,
          69,
          57,
          21,
          33,
          55,
          92,
          62,
          47,
          50,
          56,
          16,
          63,
          60,
          55,
          65,
          76,
          33,
          45,
          64,
          54,
          81,
          80,
          23,
          16,
          37,
          60,
          70,
          46,
          68,
          46,
          51,
          33,
          57,
          75,
          70,
          95,
          70,
          50,
          68,
          63,
          66,
          53,
          38,
          52,
          19,
          11,
          53,
          36,
          71,
          96,
          55,
          58,
          29,
          31,
          55,
          52,
          44,
          16,
          11,
          73,
          87,
          55,
          78,
          19,
          70,
          29,
          25,
          26,
          84,
          65,
          53,
          54,
          57,
          71,
          64,
          75,
          72,
          39,
          47,
          52,
          73,
          89,
          56,
          86,
          15,
          88,
          45,
          33,
          56,
          12,
          14,
          14,
          64
        ],
        [
          "y1",
          22,
          12,
          30,
          40,
          33,
          23,
          18,
          41,
          45,
          69,
          57,
          61,
          70,
          47,
          31,
          34,
          40,
          55,
          27,
          57,
          48,
          32,
          40,
          49,
          54,
          49,
          34,
          51,
          51,
          51,
          66,
          51,
          94,
          60,
          64,
          28,
          44,
          96,
          49,
          73,
          30,
          88,
          63,
          42,
          56,
          67,
          52,
          67,
          35,
          61,
          40,
          55,
          63,
          61,
          105,
          59,
          51,
          76,
          63,
          57,
          47,
          56,
          51,
          98,
          103,
          62,
          54,
          104,
          48,
          41,
          41,
          37,
          30,
          28,
          26,
          37,
          65,
          86,
          70,
          81,
          54,
          74,
          70,
          50,
          74,
          79,
          85,
          62,
          36,
          46,
          68,
          43,
          66,
          50,
          28,
          66,
          39,
          23,
          63,
          74,
          83,
          66,
          40,
          60,
          29,
          36,
          27,
          54,
          89,
          50,
          73,
          52
        ],
        [
          "y2",
          23,
          13,
          30,
          70,
          33,
          33,
          18,
          71,
          71,
          69,
          17,
          61,
          70,
          77,
          31,
          37,
          70,
          11,
          37,
          17,
          78,
          33,
          70,
          79,
          17,
          79,
          37,
          11,
          11,
          11,
          66,
          11,
          97,
          60,
          67,
          38,
          77,
          96,
          79,
          73,
          30,
          88,
          63,
          73,
          16,
          67,
          13,
          67,
          31,
          61,
          70,
          11,
          63,
          61,
          101,
          19,
          11,
          76,
          63,
          17,
          77,
          16,
          11,
          98,
          103,
          63,
          17,
          107,
          78,
          71,
          71,
          37,
          30,
          38,
          36,
          37,
          61,
          86,
          70,
          81,
          17,
          77,
          70,
          50,
          77,
          79,
          85,
          63,
          36,
          76,
          68,
          73,
          66,
          50,
          38,
          66,
          39,
          33,
          63,
          77,
          83,
          66,
          70,
          60,
          39,
          36,
          27,
          57,
          89,
          50,
          73,
          52
        ]
      ],
      types: { y0: "line", y1: "line", x: "x" },
      names: { y0: "#0", y1: "#1" },
      colors: { y0: "#64aded", y1: "#9ed448", y2: "#f79e39" }
    };

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const ratio = writable(0);
    const theme = writable("light");

    const changeScale = ({ detail }) => {
      const { leftBorder, widthColumnMap, ratioMap } = detail;

      const widthColumn = 1000 / ratioMap;
      const position = (-leftBorder * widthColumn) / widthColumnMap + 5 * widthColumnMap;
      const newRatio = widthColumn / widthColumnMap;

      return { newRatio, position, column: widthColumn };
    };

    function formateDate(value, type) {
        const day = new Date(value).getDate();
        const month = new Date(value).toLocaleString("en", {
          month: type
        });

        return `${day} ${month}`;
      }

    function findMaxValue(yData) {
        const shareArray = Object.keys(yData).reduce((acc, key) => {
          return [...acc, ...yData[key]];
        }, []);

        return Math.max(...shareArray);
      }

    /* src\components\map.svelte generated by Svelte v3.12.1 */

    const file = "src\\components\\map.svelte";

    function create_fragment(ctx) {
    	var div5, div0, div0_class_value, t0, div1, div1_class_value, t1, div2, div2_class_value, t2, div3, div3_class_value, t3, div4, div4_class_value, t4, canvas, dispose;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			t2 = space();
    			div3 = element("div");
    			t3 = space();
    			div4 = element("div");
    			t4 = space();
    			canvas = element("canvas");
    			attr_dev(div0, "class", div0_class_value = "mask mask--" + ctx.$theme + " right" + " svelte-1f02xqb");
    			set_style(div0, "transform", "translateX(" + (ctx.leftBorder + ctx.scale + widthBorder) + "px)");
    			set_style(div0, "width", "" + (1000 - ctx.scale - ctx.leftBorder) + "px");
    			add_location(div0, file, 230, 2, 4582);
    			attr_dev(div1, "class", div1_class_value = "mask mask--" + ctx.$theme + " left" + " svelte-1f02xqb");
    			set_style(div1, "transform", "translateX(" + (ctx.leftBorder - 1000) + "px)");
    			add_location(div1, file, 233, 2, 4743);
    			attr_dev(div2, "class", div2_class_value = "handle handle--" + ctx.$theme + " svelte-1f02xqb");
    			set_style(div2, "transform", "translateX(" + (ctx.leftBorder + widthBorder) + "px)");
    			set_style(div2, "width", "" + ctx.scale + "px");
    			add_location(div2, file, 237, 2, 4853);
    			attr_dev(div3, "class", div3_class_value = "border border--" + ctx.$theme + " border_left" + " svelte-1f02xqb");
    			set_style(div3, "transform", "translateX(" + ctx.leftBorder + "px)");
    			add_location(div3, file, 242, 2, 5033);
    			attr_dev(div4, "class", div4_class_value = "border border--" + ctx.$theme + " border_right" + " svelte-1f02xqb");
    			set_style(div4, "transform", "translateX(" + (ctx.leftBorder + ctx.scale + widthBorder) + "px)");
    			add_location(div4, file, 246, 2, 5186);
    			attr_dev(canvas, "class", "map svelte-1f02xqb");
    			attr_dev(canvas, "width", "1000px");
    			attr_dev(canvas, "height", "50px");
    			set_style(canvas, "transform", "translateX(0px)");
    			add_location(canvas, file, 251, 2, 5365);
    			attr_dev(div5, "class", "map-wrapper svelte-1f02xqb");
    			add_location(div5, file, 229, 0, 4534);

    			dispose = [
    				listen_dev(window, "mousemove", ctx.handleMoveBorder),
    				listen_dev(window, "mouseup", ctx.resetMouseActions),
    				listen_dev(window, "mouseenter", ctx.resetMouseActions),
    				listen_dev(div2, "mousedown", ctx.mousedown_handler),
    				listen_dev(div3, "mousedown", ctx.handleDownLeftBorder),
    				listen_dev(div4, "mousedown", ctx.handleDownRightBorder)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div5, t0);
    			append_dev(div5, div1);
    			append_dev(div5, t1);
    			append_dev(div5, div2);
    			append_dev(div5, t2);
    			append_dev(div5, div3);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div5, t4);
    			append_dev(div5, canvas);
    			ctx.canvas_binding(canvas);
    			ctx.div5_binding(div5);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.$theme) && div0_class_value !== (div0_class_value = "mask mask--" + ctx.$theme + " right" + " svelte-1f02xqb")) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (changed.leftBorder || changed.scale) {
    				set_style(div0, "transform", "translateX(" + (ctx.leftBorder + ctx.scale + widthBorder) + "px)");
    			}

    			if (changed.scale || changed.leftBorder) {
    				set_style(div0, "width", "" + (1000 - ctx.scale - ctx.leftBorder) + "px");
    			}

    			if ((changed.$theme) && div1_class_value !== (div1_class_value = "mask mask--" + ctx.$theme + " left" + " svelte-1f02xqb")) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			if (changed.leftBorder) {
    				set_style(div1, "transform", "translateX(" + (ctx.leftBorder - 1000) + "px)");
    			}

    			if ((changed.$theme) && div2_class_value !== (div2_class_value = "handle handle--" + ctx.$theme + " svelte-1f02xqb")) {
    				attr_dev(div2, "class", div2_class_value);
    			}

    			if (changed.leftBorder) {
    				set_style(div2, "transform", "translateX(" + (ctx.leftBorder + widthBorder) + "px)");
    			}

    			if (changed.scale) {
    				set_style(div2, "width", "" + ctx.scale + "px");
    			}

    			if ((changed.$theme) && div3_class_value !== (div3_class_value = "border border--" + ctx.$theme + " border_left" + " svelte-1f02xqb")) {
    				attr_dev(div3, "class", div3_class_value);
    			}

    			if (changed.leftBorder) {
    				set_style(div3, "transform", "translateX(" + ctx.leftBorder + "px)");
    			}

    			if ((changed.$theme) && div4_class_value !== (div4_class_value = "border border--" + ctx.$theme + " border_right" + " svelte-1f02xqb")) {
    				attr_dev(div4, "class", div4_class_value);
    			}

    			if (changed.leftBorder || changed.scale) {
    				set_style(div4, "transform", "translateX(" + (ctx.leftBorder + ctx.scale + widthBorder) + "px)");
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div5);
    			}

    			ctx.canvas_binding(null);
    			ctx.div5_binding(null);
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    const widthBorder = 5;

    function instance($$self, $$props, $$invalidate) {
    	let $theme;

    	validate_store(theme, 'theme');
    	component_subscribe($$self, theme, $$value => { $theme = $$value; $$invalidate('$theme', $theme); });

    	

      const dispatch = createEventDispatcher();

      let { rightBorderMap, leftBorderMap, columnChart, xData, yData, draw } = $$props;

      let canvasRef;
      let mapRef;
      const widthColumn = 1000 / xData.length;

      let isMouseDown = false;
      let isMovingRightBorder = false;
      let isMovingLeftBorder = false;

      let scale = 300;
      let offset = 0;

      let leftBorder = 0;
      let rightBorder = leftBorder + scale + 15;
      let distance;

      let ratioMap = 34;


      onMount(() => {
        if (!canvasRef.getContext) {
          return;
        }
        const ctx = canvasRef.getContext("2d");
        draw(ctx, 0.5);

        ratio.update(() => columnChart / widthColumn);
      });

      afterUpdate(() => {
        offset = mapRef.offsetLeft;
      });

      const checkChartBorders = x => {
        if (x < -widthBorder) {
          return -widthBorder;
        }
        if (x + scale > 1000) {
          return 990 - scale;
        }

        return x;
      };

      const checkRightSlider = x => {
        if (x - leftBorder < 150 && x < rightBorder) {
          x = rightBorder;
        }
        return x;
      };

      const checkLeftSlider = x => {
        if (rightBorder - x < 150 && x > leftBorder) {
          x = leftBorder;
        }
        return x;
      };

      const handleSliderMove = e => {
        if (!isMouseDown) {
          return;
        }

        const x = e.clientX;

        if (!distance) {
          distance = x - leftBorder;
        }

        $$invalidate('leftBorder', leftBorder = checkChartBorders(x - distance));
        rightBorder = leftBorder + scale + widthBorder;

        dispatch("move", { positionXMap: leftBorder });
      };

      const handleDownRightBorder = e => {
        isMovingRightBorder = true;
      };

      const handleDownLeftBorder = e => {
        isMovingLeftBorder = true;
      };

      const handleMoveBorder = e => {
        if (isMouseDown) {
          handleSliderMove(e);
        }

        if (!isMovingRightBorder && !isMovingLeftBorder) {
          return;
        }

        if (isMovingRightBorder) {
          rightBorder = checkRightSlider(e.clientX - offset - 6);
        } else {
          $$invalidate('leftBorder', leftBorder = checkLeftSlider(e.clientX - offset + 6));
        }

        $$invalidate('ratioMap', ratioMap = (rightBorder - widthBorder - leftBorder) / widthColumn);
        dispatch("changeScale", {
          leftBorder,
          ratioMap,
          widthColumnMap: widthColumn
        });
      };

      const resetMouseActions = () => {
        isMovingLeftBorder = false;
        isMovingRightBorder = false;
        $$invalidate('isMouseDown', isMouseDown = false);
        distance = null;
      };

    	const writable_props = ['rightBorderMap', 'leftBorderMap', 'columnChart', 'xData', 'yData', 'draw'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Map> was created with unknown prop '${key}'`);
    	});

    	const mousedown_handler = () => ($$invalidate('isMouseDown', isMouseDown = true));

    	function canvas_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('canvasRef', canvasRef = $$value);
    		});
    	}

    	function div5_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('mapRef', mapRef = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ('rightBorderMap' in $$props) $$invalidate('rightBorderMap', rightBorderMap = $$props.rightBorderMap);
    		if ('leftBorderMap' in $$props) $$invalidate('leftBorderMap', leftBorderMap = $$props.leftBorderMap);
    		if ('columnChart' in $$props) $$invalidate('columnChart', columnChart = $$props.columnChart);
    		if ('xData' in $$props) $$invalidate('xData', xData = $$props.xData);
    		if ('yData' in $$props) $$invalidate('yData', yData = $$props.yData);
    		if ('draw' in $$props) $$invalidate('draw', draw = $$props.draw);
    	};

    	$$self.$capture_state = () => {
    		return { rightBorderMap, leftBorderMap, columnChart, xData, yData, draw, canvasRef, mapRef, isMouseDown, isMovingRightBorder, isMovingLeftBorder, scale, offset, leftBorder, rightBorder, distance, ratioMap, $theme };
    	};

    	$$self.$inject_state = $$props => {
    		if ('rightBorderMap' in $$props) $$invalidate('rightBorderMap', rightBorderMap = $$props.rightBorderMap);
    		if ('leftBorderMap' in $$props) $$invalidate('leftBorderMap', leftBorderMap = $$props.leftBorderMap);
    		if ('columnChart' in $$props) $$invalidate('columnChart', columnChart = $$props.columnChart);
    		if ('xData' in $$props) $$invalidate('xData', xData = $$props.xData);
    		if ('yData' in $$props) $$invalidate('yData', yData = $$props.yData);
    		if ('draw' in $$props) $$invalidate('draw', draw = $$props.draw);
    		if ('canvasRef' in $$props) $$invalidate('canvasRef', canvasRef = $$props.canvasRef);
    		if ('mapRef' in $$props) $$invalidate('mapRef', mapRef = $$props.mapRef);
    		if ('isMouseDown' in $$props) $$invalidate('isMouseDown', isMouseDown = $$props.isMouseDown);
    		if ('isMovingRightBorder' in $$props) isMovingRightBorder = $$props.isMovingRightBorder;
    		if ('isMovingLeftBorder' in $$props) isMovingLeftBorder = $$props.isMovingLeftBorder;
    		if ('scale' in $$props) $$invalidate('scale', scale = $$props.scale);
    		if ('offset' in $$props) offset = $$props.offset;
    		if ('leftBorder' in $$props) $$invalidate('leftBorder', leftBorder = $$props.leftBorder);
    		if ('rightBorder' in $$props) rightBorder = $$props.rightBorder;
    		if ('distance' in $$props) distance = $$props.distance;
    		if ('ratioMap' in $$props) $$invalidate('ratioMap', ratioMap = $$props.ratioMap);
    		if ('$theme' in $$props) theme.set($theme);
    	};

    	$$self.$$.update = ($$dirty = { ratioMap: 1, leftBorderMap: 1, rightBorderMap: 1 }) => {
    		if ($$dirty.ratioMap) { $$invalidate('scale', scale = ratioMap * widthColumn); }
    		if ($$dirty.leftBorderMap) { $$invalidate('leftBorder', leftBorder = leftBorderMap + widthBorder || 0); }
    		if ($$dirty.rightBorderMap) { rightBorder = rightBorderMap + widthBorder; }
    	};

    	return {
    		rightBorderMap,
    		leftBorderMap,
    		columnChart,
    		xData,
    		yData,
    		draw,
    		canvasRef,
    		mapRef,
    		isMouseDown,
    		scale,
    		leftBorder,
    		handleDownRightBorder,
    		handleDownLeftBorder,
    		handleMoveBorder,
    		resetMouseActions,
    		$theme,
    		mousedown_handler,
    		canvas_binding,
    		div5_binding
    	};
    }

    class Map$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["rightBorderMap", "leftBorderMap", "columnChart", "xData", "yData", "draw"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Map", options, id: create_fragment.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.rightBorderMap === undefined && !('rightBorderMap' in props)) {
    			console.warn("<Map> was created without expected prop 'rightBorderMap'");
    		}
    		if (ctx.leftBorderMap === undefined && !('leftBorderMap' in props)) {
    			console.warn("<Map> was created without expected prop 'leftBorderMap'");
    		}
    		if (ctx.columnChart === undefined && !('columnChart' in props)) {
    			console.warn("<Map> was created without expected prop 'columnChart'");
    		}
    		if (ctx.xData === undefined && !('xData' in props)) {
    			console.warn("<Map> was created without expected prop 'xData'");
    		}
    		if (ctx.yData === undefined && !('yData' in props)) {
    			console.warn("<Map> was created without expected prop 'yData'");
    		}
    		if (ctx.draw === undefined && !('draw' in props)) {
    			console.warn("<Map> was created without expected prop 'draw'");
    		}
    	}

    	get rightBorderMap() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rightBorderMap(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get leftBorderMap() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set leftBorderMap(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get columnChart() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set columnChart(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get xData() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xData(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get yData() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set yData(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get draw() {
    		throw new Error("<Map>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set draw(value) {
    		throw new Error("<Map>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\barChart.svelte generated by Svelte v3.12.1 */
    const { Object: Object_1 } = globals;

    const file$1 = "src\\components\\barChart.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object_1.create(ctx);
    	child_ctx.views = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (351:4) {#if tooltip}
    function create_if_block(ctx) {
    	var div, p, t0_value = ctx.tooltip.date + "", t0, t1, section, div_class_value;

    	let each_value = ctx.tooltip.views;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			section = element("section");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(p, "class", "date svelte-12bhjpd");
    			add_location(p, file$1, 354, 8, 8215);
    			attr_dev(section, "class", "info svelte-12bhjpd");
    			add_location(section, file$1, 355, 8, 8259);
    			attr_dev(div, "class", div_class_value = "tooltip tooltip--" + ctx.$theme + " svelte-12bhjpd");
    			set_style(div, "top", "50px");
    			set_style(div, "left", "" + (ctx.tooltip.x - 65) + "px");
    			add_location(div, file$1, 351, 6, 8104);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(div, t1);
    			append_dev(div, section);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section, null);
    			}
    		},

    		p: function update(changed, ctx) {
    			if ((changed.tooltip) && t0_value !== (t0_value = ctx.tooltip.date + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if (changed.colors || changed.tooltip || changed.Object || changed.yData) {
    				each_value = ctx.tooltip.views;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(section, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}

    			if ((changed.$theme) && div_class_value !== (div_class_value = "tooltip tooltip--" + ctx.$theme + " svelte-12bhjpd")) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (changed.tooltip) {
    				set_style(div, "left", "" + (ctx.tooltip.x - 65) + "px");
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(351:4) {#if tooltip}", ctx });
    	return block;
    }

    // (357:10) {#each tooltip.views as views, i}
    function create_each_block(ctx) {
    	var div, t0_value = ctx.Object.keys(ctx.yData)[ctx.i] + "", t0, t1, span, t2_value = ctx.views + "", t2, t3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(":\r\n              ");
    			span = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			add_location(span, file$1, 359, 14, 8442);
    			attr_dev(div, "class", "views svelte-12bhjpd");
    			set_style(div, "color", ctx.colors[ctx.i]);
    			add_location(div, file$1, 357, 12, 8340);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, span);
    			append_dev(span, t2);
    			append_dev(div, t3);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.yData) && t0_value !== (t0_value = ctx.Object.keys(ctx.yData)[ctx.i] + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if ((changed.tooltip) && t2_value !== (t2_value = ctx.views + "")) {
    				set_data_dev(t2, t2_value);
    			}

    			if (changed.colors) {
    				set_style(div, "color", ctx.colors[ctx.i]);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(357:10) {#each tooltip.views as views, i}", ctx });
    	return block;
    }

    function create_fragment$1(ctx) {
    	var div4, div0, p0, t0, t1, p1, t2_value = formateDate(ctx.xData[ctx.startDay], 'short') + "", t2, t3, t4_value = formateDate(ctx.xData[ctx.endDay], 'short') + "", t4, t5, div3, canvas, t6, div1, div1_class_value, t7, div2, div2_class_value, t8, div3_style_value, t9, current, dispose;

    	var if_block = (ctx.tooltip) && create_if_block(ctx);

    	var map = new Map$1({
    		props: {
    		draw: ctx.drawRectangle,
    		columnChart: ctx.widthColumn,
    		xData: ctx.xData,
    		rightBorderMap: ctx.rightBorderMap,
    		leftBorderMap: ctx.leftBorderMap,
    		yData: ctx.yData.banans
    	},
    		$$inline: true
    	});
    	map.$on("move", ctx.moveSlider);
    	map.$on("changeScale", ctx.handleChangeScale);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			t0 = text(ctx.title);
    			t1 = space();
    			p1 = element("p");
    			t2 = text(t2_value);
    			t3 = text(" - ");
    			t4 = text(t4_value);
    			t5 = space();
    			div3 = element("div");
    			canvas = element("canvas");
    			t6 = space();
    			div1 = element("div");
    			t7 = space();
    			div2 = element("div");
    			t8 = space();
    			if (if_block) if_block.c();
    			t9 = space();
    			map.$$.fragment.c();
    			attr_dev(p0, "class", "title svelte-12bhjpd");
    			add_location(p0, file$1, 321, 4, 7199);
    			add_location(p1, file$1, 322, 4, 7233);
    			attr_dev(div0, "class", "header svelte-12bhjpd");
    			add_location(div0, file$1, 320, 2, 7173);
    			attr_dev(canvas, "class", "cnvs");
    			attr_dev(canvas, "width", ctx.widthCanvas * 3);
    			attr_dev(canvas, "height", "504px");
    			set_style(canvas, "transform", "translateX(" + ctx.currentPositionX + "px)");
    			add_location(canvas, file$1, 335, 4, 7624);
    			attr_dev(div1, "class", div1_class_value = "wrapper wrapper--" + ctx.$theme + " left" + " svelte-12bhjpd");
    			set_style(div1, "transform", "translateX(" + ctx.limit + "px)");
    			add_location(div1, file$1, 343, 4, 7843);
    			attr_dev(div2, "class", div2_class_value = "wrapper wrapper--" + ctx.$theme + " right" + " svelte-12bhjpd");
    			set_style(div2, "transform", "translateX(" + (ctx.limit - ctx.widthColumn - 1000) + "px)");
    			add_location(div2, file$1, 346, 4, 7951);
    			attr_dev(div3, "class", "chart svelte-12bhjpd");
    			attr_dev(div3, "style", div3_style_value = ctx.isMouseDown ? 'cursor: grabbing' : 'cursor: grab');
    			add_location(div3, file$1, 326, 2, 7347);
    			attr_dev(div4, "class", "chart-one svelte-12bhjpd");
    			add_location(div4, file$1, 319, 0, 7146);

    			dispose = [
    				listen_dev(canvas, "mouseover", ctx.handleMouseEnter),
    				listen_dev(div3, "mousemove", ctx.handleMouseMove),
    				listen_dev(div3, "mousedown", ctx.handleMouseDown),
    				listen_dev(div3, "mouseleave", ctx.handleMouseLeave),
    				listen_dev(div3, "mouseup", ctx.mouseup_handler)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, p0);
    			append_dev(p0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, p1);
    			append_dev(p1, t2);
    			append_dev(p1, t3);
    			append_dev(p1, t4);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, canvas);
    			ctx.canvas_binding(canvas);
    			append_dev(div3, t6);
    			append_dev(div3, div1);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div3, t8);
    			if (if_block) if_block.m(div3, null);
    			ctx.div3_binding(div3);
    			append_dev(div4, t9);
    			mount_component(map, div4, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.title) {
    				set_data_dev(t0, ctx.title);
    			}

    			if ((!current || changed.xData || changed.startDay) && t2_value !== (t2_value = formateDate(ctx.xData[ctx.startDay], 'short') + "")) {
    				set_data_dev(t2, t2_value);
    			}

    			if ((!current || changed.xData || changed.endDay) && t4_value !== (t4_value = formateDate(ctx.xData[ctx.endDay], 'short') + "")) {
    				set_data_dev(t4, t4_value);
    			}

    			if (!current || changed.currentPositionX) {
    				set_style(canvas, "transform", "translateX(" + ctx.currentPositionX + "px)");
    			}

    			if ((!current || changed.$theme) && div1_class_value !== (div1_class_value = "wrapper wrapper--" + ctx.$theme + " left" + " svelte-12bhjpd")) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			if (!current || changed.limit) {
    				set_style(div1, "transform", "translateX(" + ctx.limit + "px)");
    			}

    			if ((!current || changed.$theme) && div2_class_value !== (div2_class_value = "wrapper wrapper--" + ctx.$theme + " right" + " svelte-12bhjpd")) {
    				attr_dev(div2, "class", div2_class_value);
    			}

    			if (!current || changed.limit || changed.widthColumn) {
    				set_style(div2, "transform", "translateX(" + (ctx.limit - ctx.widthColumn - 1000) + "px)");
    			}

    			if (ctx.tooltip) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div3, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((!current || changed.isMouseDown) && div3_style_value !== (div3_style_value = ctx.isMouseDown ? 'cursor: grabbing' : 'cursor: grab')) {
    				attr_dev(div3, "style", div3_style_value);
    			}

    			var map_changes = {};
    			if (changed.widthColumn) map_changes.columnChart = ctx.widthColumn;
    			if (changed.xData) map_changes.xData = ctx.xData;
    			if (changed.rightBorderMap) map_changes.rightBorderMap = ctx.rightBorderMap;
    			if (changed.leftBorderMap) map_changes.leftBorderMap = ctx.leftBorderMap;
    			if (changed.yData) map_changes.yData = ctx.yData.banans;
    			map.$set(map_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(map.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(map.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div4);
    			}

    			ctx.canvas_binding(null);
    			if (if_block) if_block.d();
    			ctx.div3_binding(null);

    			destroy_component(map);

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    let positionXMap = 0;

    function instance$1($$self, $$props, $$invalidate) {
    	let $ratio, $theme;

    	validate_store(ratio, 'ratio');
    	component_subscribe($$self, ratio, $$value => { $ratio = $$value; $$invalidate('$ratio', $ratio); });
    	validate_store(theme, 'theme');
    	component_subscribe($$self, theme, $$value => { $theme = $$value; $$invalidate('$theme', $theme); });

    	

      let canvasRef;
      let chartRef;

      let ctx;

      let { xData, yData, colors, title } = $$props;

      let widthColumn = 30;
      let tooltip;
      let limit = 0;
      let currentPositionX = 0;
      let initialPositionX = 0;
      let isMouseDown = false;
      let offset = 0;
      let currentColumn;
      let rightBorderMap;
      let leftBorderMap;

      const widthCanvas = xData.length * widthColumn;
      const dataArray = xData.map((val, i) => i * widthColumn);

      let endDay;
      let startDay;

      onMount(() => {
        if (canvasRef.getContext) {
          ctx = canvasRef.getContext("2d");
          draw();
        }
      });

      afterUpdate(() => {
        offset = chartRef.offsetLeft;
      });

      const draw = () => {
        drawRectangle(ctx, 5);
        drawAxis(ctx);
        drawTextX(ctx);
        drawTextY(ctx);
      };

      const drawRectangle = (ctx, h) => {
        const dataKeys = Object.keys(yData);
        const max = findMaxValue(yData);
        const scale = 100 / (max * dataKeys.length);
        const width = h === 5 ? widthColumn : 1000 / xData.length;

        for (let i = 0; i < xData.length; i++) {
          let point = h === 5 ? 40 : 0;
          dataKeys.map((key, index) => {
            const computedHeight = yData[key][i] * h * scale;
            ctx.fillStyle = colors[index];
            ctx.fillRect(
              i * width,
              h * 100 - computedHeight - point,
              width,
              computedHeight
            );
            point = point + computedHeight;
          });
        }
      };

      const drawAxis = ctx => {
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = "#EAEBF3";
          ctx.lineWidth = 0.3;
          ctx.beginPath();
          ctx.moveTo(widthColumn, 92 * i);
          ctx.lineTo(widthCanvas * 3, 92 * i);
          ctx.stroke();
        }
      };

      const drawTextX = ctx => {
        ctx.fillStyle = "#a6a6a6";
        for (let i = 0; i < xData.length; i++) {
          if (i % 5 === 0) {
            const date = formateDate(xData[i], "short");
            ctx.font = "14px Roboto";
            ctx.fillText(date, widthColumn * (i + 1), 480);
          }
        }
      };

      const drawTextY = (ctx, y = 15) => {
        ctx.fillStyle = "#737373";
        for (let i = 0; i < 5; i++) {
          const date = formateDate(xData[i], "short");
          ctx.font = "14px Roboto";
          ctx.fillText(100 - i * 20, y, i * 92 - 5);
        }
      };

      const getLimitBorder = x => {
        if (!currentColumn || !isMouseDown) {
          currentColumn = findColumnIndex(x);
        }
        $$invalidate('limit', limit = currentColumn * widthColumn + widthColumn + currentPositionX);
      };

      const findColumnIndex = (x, dataArray = columns) => {
        const position = x - offset;
        return dataArray.findIndex(
          (column, i) => column <= position && position <= dataArray[i + 1]
        );
      };

      const checkTooltipBorders = x => {
        let rightX = x - offset;

        if (rightX < 100) {
          rightX = 100;
        }
        if (rightX > 940) {
          rightX = 940;
        }

        return rightX;
      };

      const updateDataTooltip = e => {
        const index = findColumnIndex(e.clientX);
        const dateColumn = formateDate(xData[index], "long");
        const views = Object.keys(yData).map(key => yData[key][index]);

        $$invalidate('tooltip', tooltip = {
          ...tooltip,
          date: dateColumn,
          views
        });
      };

      const updatePositionTooltip = e => {
        $$invalidate('tooltip', tooltip = {
          ...tooltip,
          x: checkTooltipBorders(e.clientX),
          y: e.clientY
        });
      };

      const renderTooltip = e => {
        if (!chartRef.contains(e.target)) {
          $$invalidate('tooltip', tooltip = null);
          return;
        }
        updateDataTooltip(e);
        updatePositionTooltip(e);
      };

      const checkChartBorders = (x, translate, widthChart) => {
        let position = translate;
        const currentWidth = xData.length * widthColumn - 1000;

        if (translate >= currentWidth) {
          return -currentWidth + 10;
        }
        if (translate <= 0) {
          position = 0;
        } else {
          position = -translate;
        }

        return position;
      };
      
      const handleMouseMove = e => {
        if (isMouseDown) {
          const translate = -1 * (e.clientX - initialPositionX);

          $$invalidate('currentPositionX', currentPositionX = checkChartBorders(
            e.clientX,
            translate));
          $$invalidate('leftBorderMap', leftBorderMap = -currentPositionX / $ratio);
          $$invalidate('rightBorderMap', rightBorderMap = (-currentPositionX + 1000) / $ratio);
          updatePositionTooltip(e);
        } else {
          renderTooltip(e);
        }
        getLimitBorder(e.clientX);
      };

      const handleMouseDown = e => {
        initialPositionX = e.pageX + -1 * currentPositionX;
        $$invalidate('isMouseDown', isMouseDown = true);
      };

      const handleMouseLeave = () => {
        $$invalidate('isMouseDown', isMouseDown = false);
        $$invalidate('tooltip', tooltip = null);
      };

      const handleMouseEnter = e => {
        renderTooltip(e);
      };

      const moveSlider = ({ detail }) => {
        const { positionXMap } = detail;
        $$invalidate('currentPositionX', currentPositionX = -positionXMap * $ratio);
      };

      const handleChangeScale = ({ detail }) => {
        if (!ctx) {
          return;
        }

        const { newRatio, position, column } = changeScale({ detail });

        $$invalidate('widthColumn', widthColumn = column);
        $$invalidate('currentPositionX', currentPositionX = position);
        ratio.update(() => newRatio);

        ctx.clearRect(0, 0, widthCanvas * 3, 504);
        draw();
      };

    	const writable_props = ['xData', 'yData', 'colors', 'title'];
    	Object_1.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<BarChart> was created with unknown prop '${key}'`);
    	});

    	function canvas_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('canvasRef', canvasRef = $$value);
    		});
    	}

    	function div3_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('chartRef', chartRef = $$value);
    		});
    	}

    	const mouseup_handler = () => ($$invalidate('isMouseDown', isMouseDown = false));

    	$$self.$set = $$props => {
    		if ('xData' in $$props) $$invalidate('xData', xData = $$props.xData);
    		if ('yData' in $$props) $$invalidate('yData', yData = $$props.yData);
    		if ('colors' in $$props) $$invalidate('colors', colors = $$props.colors);
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    	};

    	$$self.$capture_state = () => {
    		return { canvasRef, chartRef, ctx, xData, yData, colors, title, widthColumn, tooltip, limit, currentPositionX, initialPositionX, isMouseDown, positionXMap, offset, currentColumn, rightBorderMap, leftBorderMap, endDay, startDay, columns, $ratio, $theme };
    	};

    	$$self.$inject_state = $$props => {
    		if ('canvasRef' in $$props) $$invalidate('canvasRef', canvasRef = $$props.canvasRef);
    		if ('chartRef' in $$props) $$invalidate('chartRef', chartRef = $$props.chartRef);
    		if ('ctx' in $$props) ctx = $$props.ctx;
    		if ('xData' in $$props) $$invalidate('xData', xData = $$props.xData);
    		if ('yData' in $$props) $$invalidate('yData', yData = $$props.yData);
    		if ('colors' in $$props) $$invalidate('colors', colors = $$props.colors);
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('widthColumn' in $$props) $$invalidate('widthColumn', widthColumn = $$props.widthColumn);
    		if ('tooltip' in $$props) $$invalidate('tooltip', tooltip = $$props.tooltip);
    		if ('limit' in $$props) $$invalidate('limit', limit = $$props.limit);
    		if ('currentPositionX' in $$props) $$invalidate('currentPositionX', currentPositionX = $$props.currentPositionX);
    		if ('initialPositionX' in $$props) initialPositionX = $$props.initialPositionX;
    		if ('isMouseDown' in $$props) $$invalidate('isMouseDown', isMouseDown = $$props.isMouseDown);
    		if ('positionXMap' in $$props) positionXMap = $$props.positionXMap;
    		if ('offset' in $$props) offset = $$props.offset;
    		if ('currentColumn' in $$props) currentColumn = $$props.currentColumn;
    		if ('rightBorderMap' in $$props) $$invalidate('rightBorderMap', rightBorderMap = $$props.rightBorderMap);
    		if ('leftBorderMap' in $$props) $$invalidate('leftBorderMap', leftBorderMap = $$props.leftBorderMap);
    		if ('endDay' in $$props) $$invalidate('endDay', endDay = $$props.endDay);
    		if ('startDay' in $$props) $$invalidate('startDay', startDay = $$props.startDay);
    		if ('columns' in $$props) columns = $$props.columns;
    		if ('$ratio' in $$props) ratio.set($ratio);
    		if ('$theme' in $$props) theme.set($theme);
    	};

    	let columns;

    	$$self.$$.update = ($$dirty = { xData: 1, widthColumn: 1, currentPositionX: 1, startDay: 1 }) => {
    		if ($$dirty.xData || $$dirty.widthColumn || $$dirty.currentPositionX) { columns = xData.map((val, i) => i * widthColumn + currentPositionX); }
    		if ($$dirty.currentPositionX || $$dirty.widthColumn || $$dirty.startDay) { {
            $$invalidate('startDay', startDay = Math.round(-currentPositionX / widthColumn));
            $$invalidate('endDay', endDay = startDay + Math.round(1000 / widthColumn));
          } }
    	};

    	return {
    		canvasRef,
    		chartRef,
    		xData,
    		yData,
    		colors,
    		title,
    		widthColumn,
    		tooltip,
    		limit,
    		currentPositionX,
    		isMouseDown,
    		rightBorderMap,
    		leftBorderMap,
    		widthCanvas,
    		endDay,
    		startDay,
    		drawRectangle,
    		handleMouseMove,
    		handleMouseDown,
    		handleMouseLeave,
    		handleMouseEnter,
    		moveSlider,
    		handleChangeScale,
    		Object,
    		$theme,
    		canvas_binding,
    		div3_binding,
    		mouseup_handler
    	};
    }

    class BarChart extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["xData", "yData", "colors", "title"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "BarChart", options, id: create_fragment$1.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.xData === undefined && !('xData' in props)) {
    			console.warn("<BarChart> was created without expected prop 'xData'");
    		}
    		if (ctx.yData === undefined && !('yData' in props)) {
    			console.warn("<BarChart> was created without expected prop 'yData'");
    		}
    		if (ctx.colors === undefined && !('colors' in props)) {
    			console.warn("<BarChart> was created without expected prop 'colors'");
    		}
    		if (ctx.title === undefined && !('title' in props)) {
    			console.warn("<BarChart> was created without expected prop 'title'");
    		}
    	}

    	get xData() {
    		throw new Error("<BarChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xData(value) {
    		throw new Error("<BarChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get yData() {
    		throw new Error("<BarChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set yData(value) {
    		throw new Error("<BarChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colors() {
    		throw new Error("<BarChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colors(value) {
    		throw new Error("<BarChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<BarChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<BarChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\diagram.svelte generated by Svelte v3.12.1 */
    const { Object: Object_1$1 } = globals;

    const file$2 = "src\\components\\diagram.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object_1$1.create(ctx);
    	child_ctx.views = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (353:4) {#if tooltip}
    function create_if_block$1(ctx) {
    	var div, p, t0_value = ctx.tooltip.date + "", t0, t1, section, div_class_value;

    	let each_value = ctx.tooltip.views;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			section = element("section");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(p, "class", "date svelte-1hxp540");
    			add_location(p, file$2, 356, 8, 8312);
    			attr_dev(section, "class", "info");
    			add_location(section, file$2, 357, 8, 8356);
    			attr_dev(div, "class", div_class_value = "tooltip tooltip--" + ctx.$theme + " svelte-1hxp540");
    			set_style(div, "top", "10px");
    			set_style(div, "left", "" + (ctx.tooltip.x - 65) + "px");
    			add_location(div, file$2, 353, 6, 8201);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(div, t1);
    			append_dev(div, section);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section, null);
    			}
    		},

    		p: function update(changed, ctx) {
    			if ((changed.tooltip) && t0_value !== (t0_value = ctx.tooltip.date + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if (changed.colors || changed.tooltip || changed.Object || changed.yData) {
    				each_value = ctx.tooltip.views;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(section, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}

    			if ((changed.$theme) && div_class_value !== (div_class_value = "tooltip tooltip--" + ctx.$theme + " svelte-1hxp540")) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (changed.tooltip) {
    				set_style(div, "left", "" + (ctx.tooltip.x - 65) + "px");
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(353:4) {#if tooltip}", ctx });
    	return block;
    }

    // (359:10) {#each tooltip.views as views, i}
    function create_each_block$1(ctx) {
    	var div, t0_value = ctx.Object.keys(ctx.yData)[ctx.i] + "", t0, t1, span, t2_value = ctx.views + "", t2, t3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(":\r\n              ");
    			span = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			add_location(span, file$2, 361, 14, 8539);
    			attr_dev(div, "class", "views svelte-1hxp540");
    			set_style(div, "color", ctx.colors[ctx.i]);
    			add_location(div, file$2, 359, 12, 8437);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, span);
    			append_dev(span, t2);
    			append_dev(div, t3);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.yData) && t0_value !== (t0_value = ctx.Object.keys(ctx.yData)[ctx.i] + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if ((changed.tooltip) && t2_value !== (t2_value = ctx.views + "")) {
    				set_data_dev(t2, t2_value);
    			}

    			if (changed.colors) {
    				set_style(div, "color", ctx.colors[ctx.i]);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$1.name, type: "each", source: "(359:10) {#each tooltip.views as views, i}", ctx });
    	return block;
    }

    function create_fragment$2(ctx) {
    	var div2, div0, p0, t0, t1, p1, t2_value = formateDate(ctx.xData[ctx.startDay], 'short') + "", t2, t3, t4_value = formateDate(ctx.xData[ctx.endDay], 'short') + "", t4, t5, div1, canvas, t6, div1_style_value, t7, current, dispose;

    	var if_block = (ctx.tooltip) && create_if_block$1(ctx);

    	var map = new Map$1({
    		props: {
    		draw: ctx.drawRectangle,
    		columnChart: ctx.widthColumn,
    		rightBorderMap: ctx.rightBorderMap,
    		leftBorderMap: ctx.leftBorderMap,
    		xData: ctx.xData,
    		yData: ctx.yData
    	},
    		$$inline: true
    	});
    	map.$on("move", ctx.moveSlider);
    	map.$on("changeScale", ctx.handleChangeScale);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			t0 = text(ctx.title);
    			t1 = space();
    			p1 = element("p");
    			t2 = text(t2_value);
    			t3 = text(" - ");
    			t4 = text(t4_value);
    			t5 = space();
    			div1 = element("div");
    			canvas = element("canvas");
    			t6 = space();
    			if (if_block) if_block.c();
    			t7 = space();
    			map.$$.fragment.c();
    			attr_dev(p0, "class", "title svelte-1hxp540");
    			add_location(p0, file$2, 330, 4, 7536);
    			add_location(p1, file$2, 331, 4, 7570);
    			attr_dev(div0, "class", "header svelte-1hxp540");
    			add_location(div0, file$2, 329, 2, 7510);
    			attr_dev(canvas, "class", "cnvs");
    			attr_dev(canvas, "width", ctx.widthCanvas * 3);
    			attr_dev(canvas, "height", "504px");
    			set_style(canvas, "transform", "translateX(" + ctx.currentPositionX + "px)");
    			add_location(canvas, file$2, 344, 4, 7961);
    			attr_dev(div1, "class", "chart svelte-1hxp540");
    			attr_dev(div1, "style", div1_style_value = ctx.isMouseDown ? 'cursor: grabbing' : 'cursor: grab');
    			add_location(div1, file$2, 335, 2, 7684);
    			attr_dev(div2, "class", "chart-two svelte-1hxp540");
    			add_location(div2, file$2, 328, 0, 7483);

    			dispose = [
    				listen_dev(canvas, "mouseover", ctx.handleMouseEnter),
    				listen_dev(div1, "mousemove", ctx.handleMouseMove),
    				listen_dev(div1, "mousedown", ctx.handleMouseDown),
    				listen_dev(div1, "mouseleave", ctx.handleMouseLeave),
    				listen_dev(div1, "mouseup", ctx.mouseup_handler)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, p0);
    			append_dev(p0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, p1);
    			append_dev(p1, t2);
    			append_dev(p1, t3);
    			append_dev(p1, t4);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, canvas);
    			ctx.canvas_binding(canvas);
    			append_dev(div1, t6);
    			if (if_block) if_block.m(div1, null);
    			ctx.div1_binding(div1);
    			append_dev(div2, t7);
    			mount_component(map, div2, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.title) {
    				set_data_dev(t0, ctx.title);
    			}

    			if ((!current || changed.xData || changed.startDay) && t2_value !== (t2_value = formateDate(ctx.xData[ctx.startDay], 'short') + "")) {
    				set_data_dev(t2, t2_value);
    			}

    			if ((!current || changed.xData || changed.endDay) && t4_value !== (t4_value = formateDate(ctx.xData[ctx.endDay], 'short') + "")) {
    				set_data_dev(t4, t4_value);
    			}

    			if (!current || changed.currentPositionX) {
    				set_style(canvas, "transform", "translateX(" + ctx.currentPositionX + "px)");
    			}

    			if (ctx.tooltip) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((!current || changed.isMouseDown) && div1_style_value !== (div1_style_value = ctx.isMouseDown ? 'cursor: grabbing' : 'cursor: grab')) {
    				attr_dev(div1, "style", div1_style_value);
    			}

    			var map_changes = {};
    			if (changed.widthColumn) map_changes.columnChart = ctx.widthColumn;
    			if (changed.rightBorderMap) map_changes.rightBorderMap = ctx.rightBorderMap;
    			if (changed.leftBorderMap) map_changes.leftBorderMap = ctx.leftBorderMap;
    			if (changed.xData) map_changes.xData = ctx.xData;
    			if (changed.yData) map_changes.yData = ctx.yData;
    			map.$set(map_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(map.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(map.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    			}

    			ctx.canvas_binding(null);
    			if (if_block) if_block.d();
    			ctx.div1_binding(null);

    			destroy_component(map);

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $theme, $ratio;

    	validate_store(theme, 'theme');
    	component_subscribe($$self, theme, $$value => { $theme = $$value; $$invalidate('$theme', $theme); });
    	validate_store(ratio, 'ratio');
    	component_subscribe($$self, ratio, $$value => { $ratio = $$value; $$invalidate('$ratio', $ratio); });

    	

      let canvasRef;
      let chartRef;

      let ctx;

      let { xData, yData, colors, title } = $$props;

      let widthColumn = 30;
      let tooltip;
      let limit = 0;
      let currentPositionX = 0;
      let initialPositionX = 0;
      let isMouseDown = false;
      let positionXMap = 0;
      let offset = 0;
      let previousIndex;
      let currentColumn;
      let rightBorderMap;
      let leftBorderMap;

      const widthCanvas = xData.length * widthColumn;
      const dataArray = xData.map((val, i) => i * widthColumn);
      const dataKeys = Object.keys(yData);

      let endDay;
      let startDay;

      onMount(() => {
        if (canvasRef.getContext) {
          ctx = canvasRef.getContext("2d");
          draw();
        }
      });

      afterUpdate(() => {
        offset = chartRef.offsetLeft;
      });

      const draw = () => {
        drawRectangle(ctx, 5);
        drawAxis(ctx);
        drawTextX(ctx);
        drawTextY(ctx);
      };

      const drawRectangle = (ctx, h) => {
        const width = h === 5 ? widthColumn : 1000 / xData.length;

        for (let i = 0; i < xData.length; i++) {
          dataKeys.map((key, index) => {
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(i * width, h * 100 - yData[key][i] * h);
            ctx.lineTo((i + 1) * width, h * 100 - yData[key][i + 1] * h);
            ctx.strokeStyle = colors[index];
            ctx.stroke();
          });
        }
      };

      const drawAxis = ctx => {
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = "#eee";
          ctx.lineWidth = 0.2;
          ctx.beginPath();
          ctx.moveTo(widthColumn, 92 * i);
          ctx.lineTo(widthCanvas * 3, 92 * i);
          ctx.strokeStyle = "#000";
          ctx.stroke();
        }
      };

      const drawTextX = ctx => {
        ctx.fillStyle = "#a6a6a6";
        for (let i = 0; i < xData.length; i++) {
          if (i % 5 === 0) {
            const date = formateDate(xData[i], "short");
            ctx.font = "14px Roboto";
            ctx.fillText(date, widthColumn * (i + 1), 480);
          }
        }
      };

      const drawTextY = (ctx, y = 15) => {
        ctx.fillStyle = "#737373";
        for (let i = 0; i < 5; i++) {
          const date = formateDate(xData[i], "short");
          ctx.font = "14px Roboto";
          ctx.fillText(100 - i * 20, y, i * 92 - 5);
        }
      };

      const drawLine = index => {
        ctx.beginPath();
        ctx.moveTo(index * widthColumn, 0);
        ctx.lineTo(index * widthColumn, 504);
        ctx.lineWidth = 0.3;
        ctx.strokeStyle = $theme === "light" ? "#000" : "#fff";
        ctx.stroke();
      };

      const drawPoint = index => {
        dataKeys.map((key, i) => {
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            index * widthColumn,
            500 - yData[key][index] * 5,
            5,
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = $theme === "light" ? "#C9AF4F" : "#fff";
          ctx.stroke();
        });
      };

      const getLimitBorder = x => {
        if (!currentColumn || !isMouseDown) {
          currentColumn = findColumnIndex(x);
        }
        limit = currentColumn * widthColumn + widthColumn + currentPositionX;
      };

      const findColumnIndex = (x, dataArray = columns) => {
        const position = x - offset;
        return dataArray.findIndex(
          (column, i) => column <= position && position <= dataArray[i + 1]
        );
      };

      const checkTooltipBorders = x => {
        let rightX = x - offset;

        if (rightX < 100) {
          rightX = 100;
        }
        if (rightX > 940) {
          rightX = 940;
        }

        return rightX;
      };

      const updateDataTooltip = e => {
        const index = findColumnIndex(e.clientX);
        const dateColumn = formateDate(xData[index], "long");
        const views = Object.keys(yData).map(key => yData[key][index]);

        $$invalidate('tooltip', tooltip = {
          ...tooltip,
          date: dateColumn,
          views
        });
      };

      const updatePositionTooltip = e => {
        $$invalidate('tooltip', tooltip = {
          ...tooltip,
          x: checkTooltipBorders(e.clientX),
          y: e.clientY
        });
      };

      const renderTooltip = e => {
        if (!chartRef.contains(e.target)) {
          $$invalidate('tooltip', tooltip = null);
          return;
        }
        updateDataTooltip(e);
        updatePositionTooltip(e);
      };

      const checkChartBorders = (x, translate, widthChart) => {
        let position = translate;

        const currentWidth = xData.length * widthColumn - 1000;

        if (translate >= currentWidth) {
          return -currentWidth + 10;
        }
        if (translate <= 0) {
          position = 0;
        } else {
          position = -translate;
        }

        return position;
      };

      const drawCurrenValue = e => {
        const index = findColumnIndex(e.clientX);

        if (previousIndex === index) {
          return;
        }
        previousIndex = index;

        ctx.clearRect(0, 0, widthCanvas * 3, 504);
        draw();
        drawPoint(index);
        drawLine(index);
      };

      const handleMouseMove = e => {
        if (isMouseDown) {
          const translate = -1 * (e.clientX - initialPositionX);

          $$invalidate('currentPositionX', currentPositionX = checkChartBorders(
            e.clientX,
            translate));

          positionXMap = currentPositionX / $ratio;
          $$invalidate('leftBorderMap', leftBorderMap = -currentPositionX / $ratio);
          $$invalidate('rightBorderMap', rightBorderMap = (-currentPositionX + 1000) / $ratio);

          updatePositionTooltip(e);
        } else {
          renderTooltip(e);
        }
        drawCurrenValue(e);
        getLimitBorder(e.clientX);
      };

      const handleMouseDown = e => {
        initialPositionX = e.pageX + -1 * currentPositionX;
        $$invalidate('isMouseDown', isMouseDown = true);
      };

      const handleMouseLeave = () => {
        $$invalidate('isMouseDown', isMouseDown = false);
        $$invalidate('tooltip', tooltip = null);
      };

      const handleMouseEnter = e => {
        renderTooltip(e);
      };

      const moveSlider = ({ detail }) => {
        const { positionXMap } = detail;
        $$invalidate('currentPositionX', currentPositionX = -positionXMap * $ratio);
      };

      const handleChangeScale = ({ detail }) => {
        if (!ctx) {
          return;
        }

        const { newRatio, position, column } = changeScale({ detail });

        $$invalidate('widthColumn', widthColumn = column);
        $$invalidate('currentPositionX', currentPositionX = position);
        ratio.update(() => newRatio);

        ctx.clearRect(0, 0, widthCanvas * 3, 504);
        draw();
      };

    	const writable_props = ['xData', 'yData', 'colors', 'title'];
    	Object_1$1.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Diagram> was created with unknown prop '${key}'`);
    	});

    	function canvas_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('canvasRef', canvasRef = $$value);
    		});
    	}

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('chartRef', chartRef = $$value);
    		});
    	}

    	const mouseup_handler = () => ($$invalidate('isMouseDown', isMouseDown = false));

    	$$self.$set = $$props => {
    		if ('xData' in $$props) $$invalidate('xData', xData = $$props.xData);
    		if ('yData' in $$props) $$invalidate('yData', yData = $$props.yData);
    		if ('colors' in $$props) $$invalidate('colors', colors = $$props.colors);
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    	};

    	$$self.$capture_state = () => {
    		return { canvasRef, chartRef, ctx, xData, yData, colors, title, widthColumn, tooltip, limit, currentPositionX, initialPositionX, isMouseDown, positionXMap, offset, previousIndex, currentColumn, rightBorderMap, leftBorderMap, endDay, startDay, columns, $theme, $ratio };
    	};

    	$$self.$inject_state = $$props => {
    		if ('canvasRef' in $$props) $$invalidate('canvasRef', canvasRef = $$props.canvasRef);
    		if ('chartRef' in $$props) $$invalidate('chartRef', chartRef = $$props.chartRef);
    		if ('ctx' in $$props) ctx = $$props.ctx;
    		if ('xData' in $$props) $$invalidate('xData', xData = $$props.xData);
    		if ('yData' in $$props) $$invalidate('yData', yData = $$props.yData);
    		if ('colors' in $$props) $$invalidate('colors', colors = $$props.colors);
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('widthColumn' in $$props) $$invalidate('widthColumn', widthColumn = $$props.widthColumn);
    		if ('tooltip' in $$props) $$invalidate('tooltip', tooltip = $$props.tooltip);
    		if ('limit' in $$props) limit = $$props.limit;
    		if ('currentPositionX' in $$props) $$invalidate('currentPositionX', currentPositionX = $$props.currentPositionX);
    		if ('initialPositionX' in $$props) initialPositionX = $$props.initialPositionX;
    		if ('isMouseDown' in $$props) $$invalidate('isMouseDown', isMouseDown = $$props.isMouseDown);
    		if ('positionXMap' in $$props) positionXMap = $$props.positionXMap;
    		if ('offset' in $$props) offset = $$props.offset;
    		if ('previousIndex' in $$props) previousIndex = $$props.previousIndex;
    		if ('currentColumn' in $$props) currentColumn = $$props.currentColumn;
    		if ('rightBorderMap' in $$props) $$invalidate('rightBorderMap', rightBorderMap = $$props.rightBorderMap);
    		if ('leftBorderMap' in $$props) $$invalidate('leftBorderMap', leftBorderMap = $$props.leftBorderMap);
    		if ('endDay' in $$props) $$invalidate('endDay', endDay = $$props.endDay);
    		if ('startDay' in $$props) $$invalidate('startDay', startDay = $$props.startDay);
    		if ('columns' in $$props) columns = $$props.columns;
    		if ('$theme' in $$props) theme.set($theme);
    		if ('$ratio' in $$props) ratio.set($ratio);
    	};

    	let columns;

    	$$self.$$.update = ($$dirty = { xData: 1, widthColumn: 1, currentPositionX: 1, startDay: 1 }) => {
    		if ($$dirty.xData || $$dirty.widthColumn || $$dirty.currentPositionX) { columns = xData.map((val, i) => i * widthColumn + currentPositionX); }
    		if ($$dirty.currentPositionX || $$dirty.widthColumn || $$dirty.startDay) { {
            $$invalidate('startDay', startDay = Math.round(-currentPositionX / widthColumn));
            $$invalidate('endDay', endDay = startDay + Math.round(1000 / widthColumn));
          } }
    	};

    	return {
    		canvasRef,
    		chartRef,
    		xData,
    		yData,
    		colors,
    		title,
    		widthColumn,
    		tooltip,
    		currentPositionX,
    		isMouseDown,
    		rightBorderMap,
    		leftBorderMap,
    		widthCanvas,
    		endDay,
    		startDay,
    		drawRectangle,
    		handleMouseMove,
    		handleMouseDown,
    		handleMouseLeave,
    		handleMouseEnter,
    		moveSlider,
    		handleChangeScale,
    		Object,
    		$theme,
    		canvas_binding,
    		div1_binding,
    		mouseup_handler
    	};
    }

    class Diagram extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["xData", "yData", "colors", "title"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Diagram", options, id: create_fragment$2.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.xData === undefined && !('xData' in props)) {
    			console.warn("<Diagram> was created without expected prop 'xData'");
    		}
    		if (ctx.yData === undefined && !('yData' in props)) {
    			console.warn("<Diagram> was created without expected prop 'yData'");
    		}
    		if (ctx.colors === undefined && !('colors' in props)) {
    			console.warn("<Diagram> was created without expected prop 'colors'");
    		}
    		if (ctx.title === undefined && !('title' in props)) {
    			console.warn("<Diagram> was created without expected prop 'title'");
    		}
    	}

    	get xData() {
    		throw new Error("<Diagram>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xData(value) {
    		throw new Error("<Diagram>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get yData() {
    		throw new Error("<Diagram>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set yData(value) {
    		throw new Error("<Diagram>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colors() {
    		throw new Error("<Diagram>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colors(value) {
    		throw new Error("<Diagram>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<Diagram>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Diagram>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\lamp.svelte generated by Svelte v3.12.1 */

    const file$3 = "src\\components\\lamp.svelte";

    function create_fragment$3(ctx) {
    	var svg, path0, path1, g0, path2, path3, g1, path4, path5, g2, path6, path7, path8, path9, path10, path11, path12;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			g0 = svg_element("g");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			g1 = svg_element("g");
    			path4 = svg_element("path");
    			path5 = svg_element("path");
    			g2 = svg_element("g");
    			path6 = svg_element("path");
    			path7 = svg_element("path");
    			path8 = svg_element("path");
    			path9 = svg_element("path");
    			path10 = svg_element("path");
    			path11 = svg_element("path");
    			path12 = svg_element("path");
    			attr_dev(path0, "d", "m314.67 391.47c6.4-21.333 19.2-40.533 36.267-55.467 32-26.667 52.267-67.2\r\n    52.267-112 0-83.2-69.333-151.47-154.67-147.2-75.734 3.2-137.6 67.2-139.73\r\n    142.93-1.067 46.934 19.2 88.534 52.267 116.27 18.133 14.933 30.933 34.133\r\n    37.333 55.467h116.27z");
    			add_location(path0, file$3, 12, 2, 245);
    			attr_dev(path1, "d", "m242.13 393.6h9.6l-42.667-158.93h3.2c5.333 0 10.667-2.133 14.933-6.4\r\n    2.133-2.133 4.267-3.2 7.467-3.2s5.333 1.067 7.467 3.2c7.467 8.533 20.267\r\n    8.533 27.733 0 2.133-2.133 4.267-3.2 7.467-3.2 2.133 0 5.333 1.067 7.467 3.2\r\n    4.267 4.267 8.533 6.4 14.933 6.4h3.2l-41.6 158.93h9.6l43.733-166.4c0-2.133\r\n    0-4.267-2.133-5.333-2.133-1.067-4.267 0-5.333 1.067-2.133 2.133-4.267\r\n    3.2-6.4 3.2-3.2\r\n    0-5.333-1.067-8.533-3.2-4.267-4.267-8.533-6.4-13.867-6.4s-9.6 2.133-13.867\r\n    6.4-10.667 4.267-14.933 0c-3.2-4.267-8.533-6.4-13.867-6.4-5.333 0-10.667\r\n    2.133-13.867 6.4-2.133 2.133-5.333 3.2-8.533 3.2-2.133\r\n    0-5.333-1.067-6.4-3.2-1.067-1.067-3.2-2.133-5.333-1.067-2.133 1.067-3.2\r\n    3.2-2.133 5.333l42.666 166.4z");
    			attr_dev(path1, "fill", "#fff");
    			add_location(path1, file$3, 18, 2, 531);
    			attr_dev(path2, "d", "m222.93 489.6c5.334 12.8 18.134 22.4 33.067 22.4s27.733-9.6\r\n      33.067-22.4h-66.134z");
    			add_location(path2, file$3, 32, 4, 1328);
    			attr_dev(path3, "d", "m295.47 490.67h-77.867c-10.667\r\n      0-19.2-8.533-19.2-19.2v-81.067h116.27v81.067c0 10.666-8.534 19.2-19.2\r\n      19.2z");
    			add_location(path3, file$3, 35, 4, 1441);
    			attr_dev(g0, "fill", "#344A5E");
    			add_location(g0, file$3, 31, 2, 1304);
    			attr_dev(path4, "d", "m313.6 430.93h-115.2c-6.4 0-11.733-5.333-11.733-11.733s5.333-11.733\r\n      11.733-11.733h115.2c6.4 0 11.733 5.333 11.733 11.733s-5.333 11.733-11.733\r\n      11.733z");
    			add_location(path4, file$3, 41, 4, 1617);
    			attr_dev(path5, "d", "m313.6 468.27h-115.2c-6.4 0-11.733-5.333-11.733-11.733s5.333-11.733\r\n      11.733-11.733h115.2c6.4 0 11.733 5.333 11.733 11.733 0 6.399-5.333\r\n      11.733-11.733 11.733z");
    			add_location(path5, file$3, 45, 4, 1806);
    			attr_dev(g1, "fill", "#415A6B");
    			add_location(g1, file$3, 40, 2, 1593);
    			attr_dev(path6, "d", "m256 0c-5.333 0-10.667 4.267-10.667 10.667v36.267c0 5.333 4.267 10.667\r\n      10.667 10.667s10.667-4.267\r\n      10.667-10.667v-36.267c0-6.4-5.334-10.667-10.667-10.667z");
    			add_location(path6, file$3, 51, 4, 2030);
    			attr_dev(path7, "d", "m113.07 65.067c-4.267-4.267-10.667-4.267-14.933 0s-4.267 10.667 0\r\n      14.933l25.6 25.6c4.267 4.267 10.667 4.267 14.933 0s4.267-10.667\r\n      0-14.933l-25.6-25.6z");
    			add_location(path7, file$3, 55, 4, 2223);
    			attr_dev(path8, "d", "m80 212.27h-36.267c-5.333 0-10.667 4.267-10.667 10.667 0 5.333 4.267\r\n      10.667 10.667 10.667h36.267c5.333 0 10.667-4.267 10.667-10.667\r\n      0-5.334-5.334-10.667-10.667-10.667z");
    			add_location(path8, file$3, 59, 4, 2413);
    			attr_dev(path9, "d", "m123.73 340.27-25.6 25.6c-4.267 4.267-4.267 10.667 0 14.933s10.667\r\n      4.267 14.933 0l25.6-25.6c4.267-4.267 4.267-10.667\r\n      0-14.933s-10.666-4.267-14.933 0z");
    			add_location(path9, file$3, 63, 4, 2620);
    			attr_dev(path10, "d", "m388.27 340.27c-4.267-4.267-10.667-4.267-14.934 0s-4.267 10.667 0\r\n      14.933l25.6 25.6c4.267 4.267 10.667 4.267 14.933 0s4.267-10.667\r\n      0-14.933l-25.599-25.6z");
    			add_location(path10, file$3, 67, 4, 2809);
    			attr_dev(path11, "d", "m468.27 212.27h-36.267c-5.333 0-10.667 4.267-10.667 10.667 0 5.333\r\n      4.267 10.667 10.667 10.667h36.267c5.333 0 10.667-4.267 10.667-10.667-1e-3\r\n      -5.334-4.267-10.667-10.667-10.667z");
    			add_location(path11, file$3, 71, 4, 3001);
    			attr_dev(path12, "d", "m398.93 65.067-25.6 25.6c-4.267 4.267-4.267 10.667 0 14.933 4.267 4.267\r\n      10.667 4.267 14.933 0l25.6-25.6c4.267-4.267 4.267-10.667\r\n      0-14.933s-10.666-4.267-14.933 0z");
    			add_location(path12, file$3, 75, 4, 3216);
    			attr_dev(g2, "fill", ctx.color);
    			add_location(g2, file$3, 50, 2, 2008);
    			attr_dev(svg, "enable-background", "new 0 0 512 512");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "width", "36px");
    			attr_dev(svg, "fill", ctx.color);
    			attr_dev(svg, "height", "36px");
    			add_location(svg, file$3, 3, 0, 44);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, g0);
    			append_dev(g0, path2);
    			append_dev(g0, path3);
    			append_dev(svg, g1);
    			append_dev(g1, path4);
    			append_dev(g1, path5);
    			append_dev(svg, g2);
    			append_dev(g2, path6);
    			append_dev(g2, path7);
    			append_dev(g2, path8);
    			append_dev(g2, path9);
    			append_dev(g2, path10);
    			append_dev(g2, path11);
    			append_dev(g2, path12);
    		},

    		p: function update(changed, ctx) {
    			if (changed.color) {
    				attr_dev(g2, "fill", ctx.color);
    				attr_dev(svg, "fill", ctx.color);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(svg);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { color } = $$props;

    	const writable_props = ['color'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Lamp> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('color' in $$props) $$invalidate('color', color = $$props.color);
    	};

    	$$self.$capture_state = () => {
    		return { color };
    	};

    	$$self.$inject_state = $$props => {
    		if ('color' in $$props) $$invalidate('color', color = $$props.color);
    	};

    	return { color };
    }

    class Lamp extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, ["color"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Lamp", options, id: create_fragment$3.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.color === undefined && !('color' in props)) {
    			console.warn("<Lamp> was created without expected prop 'color'");
    		}
    	}

    	get color() {
    		throw new Error("<Lamp>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Lamp>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.12.1 */

    const file$4 = "src\\App.svelte";

    function create_fragment$4(ctx) {
    	var div1, header, div0, h3, t1, p, t3, button, button_class_value, t4, t5, t6, t7, div1_class_value, current, dispose;

    	var lamp = new Lamp({
    		props: { color: ctx.color },
    		$$inline: true
    	});

    	var barchart0 = new BarChart({
    		props: {
    		xData: ctx.xData,
    		yData: ctx.product,
    		colors: ctx.colors,
    		title: "Chart 1"
    	},
    		$$inline: true
    	});

    	var barchart1 = new BarChart({
    		props: {
    		xData: ctx.xData,
    		yData: ctx.products,
    		colors: ctx.colors,
    		title: "Chart 2"
    	},
    		$$inline: true
    	});

    	var diagram0 = new Diagram({
    		props: {
    		xData: ctx.xData,
    		yData: ctx.product,
    		colors: ctx.colors,
    		title: "Chart 3"
    	},
    		$$inline: true
    	});

    	var diagram1 = new Diagram({
    		props: {
    		xData: ctx.xData,
    		yData: ctx.products,
    		colors: ctx.colors,
    		title: "Chart 4"
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			header = element("header");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Chart Contest";
    			t1 = space();
    			p = element("p");
    			p.textContent = "These charts are made with canvas and vanila javascript.";
    			t3 = space();
    			button = element("button");
    			lamp.$$.fragment.c();
    			t4 = space();
    			barchart0.$$.fragment.c();
    			t5 = space();
    			barchart1.$$.fragment.c();
    			t6 = space();
    			diagram0.$$.fragment.c();
    			t7 = space();
    			diagram1.$$.fragment.c();
    			attr_dev(h3, "class", "svelte-oxahje");
    			add_location(h3, file$4, 91, 6, 1772);
    			attr_dev(p, "class", "svelte-oxahje");
    			add_location(p, file$4, 92, 6, 1801);
    			attr_dev(div0, "class", "describe svelte-oxahje");
    			add_location(div0, file$4, 90, 4, 1743);
    			attr_dev(button, "class", button_class_value = "button button--" + ctx.$theme + " svelte-oxahje");
    			add_location(button, file$4, 94, 4, 1880);
    			attr_dev(header, "class", "svelte-oxahje");
    			add_location(header, file$4, 89, 2, 1730);
    			attr_dev(div1, "class", div1_class_value = "app " + ctx.$theme + " svelte-oxahje");
    			add_location(div1, file$4, 88, 0, 1701);
    			dispose = listen_dev(button, "click", ctx.changeTheme);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, header);
    			append_dev(header, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(header, t3);
    			append_dev(header, button);
    			mount_component(lamp, button, null);
    			append_dev(div1, t4);
    			mount_component(barchart0, div1, null);
    			append_dev(div1, t5);
    			mount_component(barchart1, div1, null);
    			append_dev(div1, t6);
    			mount_component(diagram0, div1, null);
    			append_dev(div1, t7);
    			mount_component(diagram1, div1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var lamp_changes = {};
    			if (changed.color) lamp_changes.color = ctx.color;
    			lamp.$set(lamp_changes);

    			if ((!current || changed.$theme) && button_class_value !== (button_class_value = "button button--" + ctx.$theme + " svelte-oxahje")) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if ((!current || changed.$theme) && div1_class_value !== (div1_class_value = "app " + ctx.$theme + " svelte-oxahje")) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(lamp.$$.fragment, local);

    			transition_in(barchart0.$$.fragment, local);

    			transition_in(barchart1.$$.fragment, local);

    			transition_in(diagram0.$$.fragment, local);

    			transition_in(diagram1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(lamp.$$.fragment, local);
    			transition_out(barchart0.$$.fragment, local);
    			transition_out(barchart1.$$.fragment, local);
    			transition_out(diagram0.$$.fragment, local);
    			transition_out(diagram1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div1);
    			}

    			destroy_component(lamp);

    			destroy_component(barchart0);

    			destroy_component(barchart1);

    			destroy_component(diagram0);

    			destroy_component(diagram1);

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $theme;

    	validate_store(theme, 'theme');
    	component_subscribe($$self, theme, $$value => { $theme = $$value; $$invalidate('$theme', $theme); });

    	

      let color = "#fff";

      const xData = data.columns[0].slice(1);
      const products = {
        banans: data.columns[1].slice(1),
        oranges: data.columns[2].slice(1),
        apples: data.columns[3].slice(1)
      };
      const product = {
        banans: data.columns[1].slice(1)
      };
      const colors = Object.values(data.colors);

      const changeTheme = () => {
        let currentTheme = $theme === "light" ? "dark" : "light";
        theme.update(() => currentTheme);
        $$invalidate('color', color = $theme === "light" ? "#fff" : "#FFD15C");
      };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('color' in $$props) $$invalidate('color', color = $$props.color);
    		if ('$theme' in $$props) theme.set($theme);
    	};

    	return {
    		color,
    		xData,
    		products,
    		product,
    		colors,
    		changeTheme,
    		$theme
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$4.name });
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
