
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
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
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
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
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
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
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
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
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.2' }, detail)));
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
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
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
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function flip(node, animation, params) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const scaleX = animation.from.width / node.clientWidth;
        const scaleY = animation.from.height / node.clientHeight;
        const dx = (animation.from.left - animation.to.left) / scaleX;
        const dy = (animation.from.top - animation.to.top) / scaleY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    /**
     * Gets the absolute bounding rect (accounts for the window's scroll position)
     * @param {HTMLElement }el
     * @return {{top: number, left: number, bottom: number, right: number}}
     */
    function getAbsoluteRect(el) {
        const rect = el.getBoundingClientRect();
        return ({
            top: rect.top + window.scrollY,
            bottom: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            right: rect.right + window.scrollX
        });
    }

    /**
     * finds the center :)
     * @typedef {Object} Rect
     * @property {number} top
     * @property {number} bottom
     * @property {number} left
     * @property {number} right
     * @param {Rect} rect
     * @return {{x: number, y: number}}
     */
    function findCenter(rect) {
        return ({
            x: (rect.left + rect.right) /2,
            y: (rect.top + rect.bottom) /2
        });    
    }

    /**
     * @typedef {Object} Point
     * @property {number} x
     * @property {number} y
     * @param {Point} pointA
     * @param {Point} pointB
     * @return {number}
     */
    function calcDistance(pointA, pointB) {
        return Math.sqrt(Math.pow(pointA.x - pointB.x, 2) +  Math.pow(pointA.y - pointB.y, 2));
    }

    /**
     * @param {Point} point
     * @param {Rect} rect
     * @return {boolean|boolean}
     */
    function isPointInsideRect(point, rect) {
        return (
            (point.y <= rect.bottom && point.y >= rect.top)
            &&
            (point.x >= rect.left && point.x <= rect.right)
        );
    }

    /**
     * find the absolute coordinates of the center of a dom element
     * @param el {HTMLElement}
     * @returns {{x: number, y: number}}
     */
    function findCenterOfElement(el) {
        return findCenter( getAbsoluteRect(el));
    }

    /**
     * @param {HTMLElement} elA
     * @param {HTMLElement} elB
     * @return {boolean}
     */
    function isCenterOfAInsideB(elA, elB) {
        const centerOfA = findCenterOfElement(elA);
        const rectOfB = getAbsoluteRect(elB);
        return isPointInsideRect(centerOfA, rectOfB);
    }

    /**
     * @param {HTMLElement|ChildNode} elA
     * @param {HTMLElement|ChildNode} elB
     * @return {number}
     */
    function calcDistanceBetweenCenters(elA, elB) {
        const centerOfA = findCenterOfElement(elA);
        const centerOfB = findCenterOfElement(elB);
        return calcDistance(centerOfA, centerOfB);
    }

    /**
     * @param {HTMLElement} el - the element to check
     * @returns {boolean} - true if the element in its entirety is off screen including the scrollable area (the normal dom events look at the mouse rather than the element)
     */
    function isElementOffDocument(el) {
        const rect = getAbsoluteRect(el);
        return rect.right < 0 || rect.left > document.documentElement.scrollWidth || rect.bottom < 0 || rect.top > document.documentElement.scrollHeight;
    }

    /**
     * If the point is inside the element returns its distances from the sides, otherwise returns null
     * @param {Point} point
     * @param {HTMLElement} el
     * @return {null|{top: number, left: number, bottom: number, right: number}}
     */
    function calcInnerDistancesBetweenPointAndSidesOfElement(point, el) {
        const rect = getAbsoluteRect(el);
        if (!isPointInsideRect(point, rect)) {
            return null;
        }
        return {
            top: point.y - rect.top,
            bottom: rect.bottom - point.y,
            left: point.x - rect.left,
            // TODO - figure out what is so special about right (why the rect is too big)
            right: Math.min(rect.right, document.documentElement.clientWidth) - point.x
        }
    }

    /**
     * @typedef {Object} Index
     * @property {number} index - the would be index
     * @property {boolean} isProximityBased - false if the element is actually over the index, true if it is not over it but this index is the closest
     */
    /**
     * Find the index for the dragged element in the list it is dragged over
     * @param {HTMLElement} floatingAboveEl 
     * @param {HTMLElement} collectionBelowEl 
     * @returns {Index|null} -  if the element is over the container the Index object otherwise null
     */
    function findWouldBeIndex(floatingAboveEl, collectionBelowEl) {
        if (!isCenterOfAInsideB(floatingAboveEl, collectionBelowEl)) {
            return null;
        }
        const children = collectionBelowEl.children;
        // the container is empty, floating element should be the first 
        if (children.length === 0) {
            return {index: 0, isProximityBased: true};
        }
        // the search could be more efficient but keeping it simple for now
        // a possible improvement: pass in the lastIndex it was found in and check there first, then expand from there
        for (let i=0; i< children.length; i++) {
            if (isCenterOfAInsideB(floatingAboveEl, children[i])) {
                return {index: i, isProximityBased: false};
            }
        }
        // this can happen if there is space around the children so the floating element has 
        //entered the container but not any of the children, in this case we will find the nearest child
        let minDistanceSoFar = Number.MAX_VALUE;
        let indexOfMin = undefined;
        // we are checking all of them because we don't know whether we are dealing with a horizontal or vertical container and where the floating element entered from
        for (let i=0; i< children.length; i++) {
            const distance = calcDistanceBetweenCenters(floatingAboveEl, children[i]);
            if (distance < minDistanceSoFar) {
                minDistanceSoFar = distance;
                indexOfMin = i;
            }
        }
        return {index: indexOfMin, isProximityBased: true};
    }

    // external events
    const FINALIZE_EVENT_NAME = 'finalize';
    const CONSIDER_EVENT_NAME = 'consider';

    function dispatchFinalizeEvent(el, items) {
        el.dispatchEvent(new CustomEvent(FINALIZE_EVENT_NAME, {
            detail: {items}
        }));
    }

    function dispatchConsiderEvent(el, items) {
        el.dispatchEvent(new CustomEvent(CONSIDER_EVENT_NAME, {
            detail: {items}
        }));
    }

    // internal events
    const DRAGGED_ENTERED_EVENT_NAME = 'draggedentered';
    const DRAGGED_LEFT_EVENT_NAME = 'draggedleft';
    const DRAGGED_OVER_INDEX_EVENT_NAME = 'draggedoverindex';
    const DRAGGED_LEFT_DOCUMENT_EVENT_NAME = 'draggedleftdocument';
    function dispatchDraggedElementEnteredContainer(containerEl, indexObj, draggedEl) {
        containerEl.dispatchEvent(new CustomEvent(DRAGGED_ENTERED_EVENT_NAME, {
            detail: {indexObj, draggedEl}
        }));
    }
    function dispatchDraggedElementLeftContainer(containerEl, draggedEl) {
        containerEl.dispatchEvent(new CustomEvent(DRAGGED_LEFT_EVENT_NAME, {
            detail: {draggedEl}
        }));
    }
    function dispatchDraggedElementIsOverIndex(containerEl, indexObj, draggedEl) {
        containerEl.dispatchEvent(new CustomEvent(DRAGGED_OVER_INDEX_EVENT_NAME, {
            detail: {indexObj, draggedEl}
        }));
    }
    function dispatchDraggedLeftDocument(draggedEl) {
        window.dispatchEvent(new CustomEvent(DRAGGED_LEFT_DOCUMENT_EVENT_NAME, {
            detail: { draggedEl}
        }));
    }

    const SCROLL_ZONE_PX = 25;

    function makeScroller() {
        let scrollingInfo;
        function resetScrolling() {
            scrollingInfo = {directionObj: undefined, stepPx: 0};
        }
        resetScrolling();
        // directionObj {x: 0|1|-1, y:0|1|-1} - 1 means down in y and right in x
        function scrollContainer(containerEl) {
            const {directionObj, stepPx} = scrollingInfo;
            if(directionObj) {
                containerEl.scrollBy(directionObj.x * stepPx, directionObj.y * stepPx);
                window.requestAnimationFrame(() => scrollContainer(containerEl));
            }
        }
        function calcScrollStepPx(distancePx) {
            return SCROLL_ZONE_PX - distancePx;
        }

        /**
         * If the pointer is next to the sides of the element to scroll, will trigger scrolling
         * Can be called repeatedly with updated pointer and elementToScroll values without issues
         * @return {boolean} - true if scrolling was needed
         */
        function scrollIfNeeded(pointer, elementToScroll) {
            if (!elementToScroll) {
                return false;
            }
            const distances = calcInnerDistancesBetweenPointAndSidesOfElement(pointer, elementToScroll);
            if (distances === null) {
                resetScrolling();
                return false;
            }
            const isAlreadyScrolling = !!scrollingInfo.directionObj;
            let [scrollingVertically, scrollingHorizontally] = [false, false];
            // vertical
            if (elementToScroll.scrollHeight > elementToScroll.clientHeight) {
                if (distances.bottom < SCROLL_ZONE_PX) {
                    scrollingVertically = true;
                    scrollingInfo.directionObj = {x:0, y:1};
                    scrollingInfo.stepPx = calcScrollStepPx(distances.bottom);
                } else if (distances.top < SCROLL_ZONE_PX) {
                    scrollingVertically = true;
                    scrollingInfo.directionObj = {x:0, y:-1};
                    scrollingInfo.stepPx = calcScrollStepPx(distances.top);
                }
                if (!isAlreadyScrolling && scrollingVertically) {
                    scrollContainer(elementToScroll);
                    return true;
                }
            }
            // horizontal
            if (elementToScroll.scrollWidth > elementToScroll.clientWidth) {
                if (distances.right < SCROLL_ZONE_PX) {
                    scrollingHorizontally = true;
                    scrollingInfo.directionObj = {x:1, y:0};
                    scrollingInfo.stepPx = calcScrollStepPx(distances.right);
                } else if (distances.left < SCROLL_ZONE_PX) {
                    scrollingHorizontally = true;
                    scrollingInfo.directionObj = {x:-1, y:0};
                    scrollingInfo.stepPx = calcScrollStepPx(distances.left);
                }
                if (!isAlreadyScrolling && scrollingHorizontally){
                    scrollContainer(elementToScroll);
                    return true;
                }
            }
            resetScrolling();
            return false;
        }

        return ({
            scrollIfNeeded,
            resetScrolling
        });
    }

    const INTERVAL_MS = 200;
    const TOLERANCE_PX = 10;
    const {scrollIfNeeded, resetScrolling} = makeScroller();
    let next;


    /**
     * Tracks the dragged elements and performs the side effects when it is dragged over a drop zone (basically dispatching custom-events scrolling)
     * @param {Set<HTMLElement>} dropZones 
     * @param {HTMLElement} draggedEl 
     * @param {number} [intervalMs = INTERVAL_MS]
     */
    function observe(draggedEl, dropZones, intervalMs = INTERVAL_MS) {
        // initialization
        let lastDropZoneFound;
        let lastIndexFound;
        let lastIsDraggedInADropZone = false;
        let lastCentrePositionOfDragged;

        /**
         * The main function in this module. Tracks where everything is/ should be a take the actions
         */
        function andNow() {
            const currentCenterOfDragged = findCenterOfElement(draggedEl);
            const scrolled = scrollIfNeeded(currentCenterOfDragged, lastDropZoneFound);
            // we only want to make a new decision after the element was moved a bit to prevent flickering
            if (!scrolled && lastCentrePositionOfDragged &&
                Math.abs(lastCentrePositionOfDragged.x - currentCenterOfDragged.x) < TOLERANCE_PX &&
                Math.abs(lastCentrePositionOfDragged.y - currentCenterOfDragged.y) < TOLERANCE_PX ) {
                next = window.setTimeout(andNow, intervalMs);
                return;
            }
            if (isElementOffDocument(draggedEl)) {
                console.debug("off document");
                dispatchDraggedLeftDocument(draggedEl);
                return;
            }

            lastCentrePositionOfDragged = currentCenterOfDragged;
            // this is a simple algorithm, potential improvement: first look at lastDropZoneFound
            let isDraggedInADropZone = false;
            for (const dz of dropZones) {
                const indexObj = findWouldBeIndex(draggedEl, dz);
                if (indexObj === null) {
                   // it is not inside
                   continue;     
                }
                const {index} = indexObj;
                isDraggedInADropZone = true;
                // the element is over a container
                if (dz !== lastDropZoneFound) {
                    lastDropZoneFound && dispatchDraggedElementLeftContainer(lastDropZoneFound, draggedEl);
                    dispatchDraggedElementEnteredContainer(dz, indexObj, draggedEl);
                    lastDropZoneFound = dz;
                    lastIndexFound = index;
                }
                else if (index !== lastIndexFound) {
                    dispatchDraggedElementIsOverIndex(dz, indexObj, draggedEl);
                    lastIndexFound = index;
                }
                // we handle looping with the 'continue' statement above
                break;
            }
            // the first time the dragged element is not in any dropzone we need to notify the last dropzone it was in
            if (!isDraggedInADropZone && lastIsDraggedInADropZone && lastDropZoneFound) {
                dispatchDraggedElementLeftContainer(lastDropZoneFound, draggedEl);
                lastDropZoneFound = undefined;
                lastIndexFound = undefined;
                lastIsDraggedInADropZone = false;
            } else {
                lastIsDraggedInADropZone = true;
            }
            next = window.setTimeout(andNow, intervalMs);
        }
        andNow();
    }

    // assumption - we can only observe one dragged element at a time, this could be changed in the future
    function unobserve() {
        console.debug("unobserving");
        clearTimeout(next);
        resetScrolling();
    }

    const INTERVAL_MS$1 = 300;
    let mousePosition;

    /**
     * Do not use this! it is visible for testing only until we get over the issue Cypress not triggering the mousemove listeners
     * // TODO - make private (remove export)
     * @param {{clientX: number, clientY: number}} e
     */
    function updateMousePosition(e) {
        mousePosition = {x: e.clientX, y: e.clientY};
    }
    const {scrollIfNeeded: scrollIfNeeded$1, resetScrolling: resetScrolling$1} = makeScroller();
    let next$1;

    function loop() {
        if (mousePosition) {
            scrollIfNeeded$1(mousePosition, document.documentElement);
        }
        next$1 = window.setTimeout(loop, INTERVAL_MS$1);
    }

    /**
     * will start watching the mouse pointer and scroll the window if it goes next to the edges
     */
    function armWindowScroller() {
        console.debug('arming window scroller');
        window.addEventListener('mousemove', updateMousePosition);
        loop();
    }

    /**
     * will stop watching the mouse pointer and won't scroll the window anymore
     */
    function disarmWindowScroller() {
        console.debug('disarming window scroller');
        window.removeEventListener('mousemove', updateMousePosition);
        mousePosition = undefined;
        window.clearTimeout(next$1);
        resetScrolling$1();
    }

    const TRANSITION_DURATION_SECONDS = 0.2;

    /**
     * private helper function - creates a transition string for a property
     * @param {string} property
     * @return {string} - the transition string
     */
    function trs(property) {
        return `${property} ${TRANSITION_DURATION_SECONDS}s ease`;
    }
    /**
     * clones the given element and applies proper styles and transitions to the dragged element
     * @param {HTMLElement} originalElement
     * @return {Node} - the cloned, styled element
     */
    function createDraggedElementFrom(originalElement) {
        const rect = originalElement.getBoundingClientRect();
        const draggedEl = originalElement.cloneNode(true);
        draggedEl.style.position = "fixed";
        draggedEl.style.top = `${rect.top}px`;
        draggedEl.style.left = `${rect.left}px`;
        draggedEl.style.margin = '0';
        // we can't have relative or automatic height and width or it will break the illusion
        draggedEl.style.boxSizing = 'border-box';
        draggedEl.style.height = `${rect.height}px`;
        draggedEl.style.width = `${rect.width}px`;
        draggedEl.style.transition = `${trs('width')}, ${trs('height')}, ${trs('background-color')}, ${trs('opacity')}, ${trs('color')} `;
        // this is a workaround for a strange browser bug that causes the right border to disappear when all the transitions are added at the same time
        window.setTimeout(() => draggedEl.style.transition +=`, ${trs('top')}, ${trs('left')}`,0);
        draggedEl.style.zIndex = '9999';
        draggedEl.style.cursor = 'grabbing';
        return draggedEl;
    }

    /**
     * styles the dragged element to a 'dropped' state
     * @param {HTMLElement} draggedEl
     */
    function moveDraggedElementToWasDroppedState(draggedEl) {
        draggedEl.style.cursor = 'grab';
    }

    /**
     * Morphs the dragged element style, maintains the mouse pointer within the element
     * @param {HTMLElement} draggedEl
     * @param {HTMLElement} copyFromEl - the element the dragged element should look like, typically the shadow element
     * @param {number} currentMouseX
     * @param {number} currentMouseY
     */
    function morphDraggedElementToBeLike(draggedEl, copyFromEl, currentMouseX, currentMouseY) {
        const newRect = copyFromEl.getBoundingClientRect();
        const draggedElRect = draggedEl.getBoundingClientRect();
        const widthChange = newRect.width - draggedElRect.width;
        const heightChange = newRect.height - draggedElRect.height;
        if (widthChange || heightChange) {
            const relativeDistanceOfMousePointerFromDraggedSides = {
                left: (currentMouseX - draggedElRect.left) / draggedElRect.width,
                top: (currentMouseY - draggedElRect.top) / draggedElRect.height
            };
            draggedEl.style.height = `${newRect.height}px`;
            draggedEl.style.width = `${newRect.width}px`;
            draggedEl.style.left = `${parseFloat(draggedEl.style.left) - relativeDistanceOfMousePointerFromDraggedSides.left * widthChange}px`;
            draggedEl.style.top = `${parseFloat(draggedEl.style.top) - relativeDistanceOfMousePointerFromDraggedSides.top * heightChange}px`;
        }

        /// other properties
        const computedStyle = window.getComputedStyle(copyFromEl);
        Array.from(computedStyle)
            .filter(s => s.startsWith('background') || s.startsWith('padding') || s.startsWith('font') || s.startsWith('text') || s.startsWith('align') ||
            s.startsWith('justify') || s.startsWith('display') || s.startsWith('flex') || s.startsWith('border') || s === 'opacity' || s === 'color')
            .forEach(s =>
                draggedEl.style.setProperty(s, computedStyle.getPropertyValue(s), computedStyle.getPropertyPriority(s))
            );
    }

    /**
     * makes the element compatible with being draggable
     * @param {HTMLElement} draggableEl
     * @param {boolean} dragDisabled
     */
    function styleDraggable(draggableEl, dragDisabled) {
        draggableEl.draggable = false;
        draggableEl.ondragstart = () => false;
        draggableEl.style.userSelect = 'none';
        draggableEl.style.cursor = dragDisabled? '': 'grab';
    }

    /**
     * styles the shadow element
     * @param {HTMLElement} shadowEl
     */
    function styleShadowEl(shadowEl) {
        shadowEl.style.visibility = "hidden";
    }

    /**
     * will mark the given dropzones as visually active
     * @param {Array<HTMLElement>} dropZones
     */
    function styleActiveDropZones(dropZones) {
        dropZones.forEach(dz => {
            dz.style.outline = 'rgba(255, 255, 102, 0.7) solid 2px';
        });
    }

    /**
     * will remove the 'active' styling from given dropzones
     * @param {Array<HTMLElement>} dropZones
     */
    function styleInActiveDropZones(dropZones) {
        dropZones.forEach(dz => {
            dz.style.outline = '';
        });
    }

    const DEFAULT_DROP_ZONE_TYPE = '--any--';
    const MIN_OBSERVATION_INTERVAL_MS = 100;
    const MIN_MOVEMENT_BEFORE_DRAG_START_PX = 3;

    let draggedEl;
    let draggedElData;
    let draggedElType;
    let originDropZone;
    let originIndex;
    let shadowElIdx;
    let shadowElData;
    let shadowElDropZone;
    let dragStartMousePosition;
    let currentMousePosition;
    let isWorkingOnPreviousDrag = false;

    // a map from type to a set of drop-zones
    let typeToDropZones = new Map();
    // important - this is needed because otherwise the config that would be used for everyone is the config of the element that created the event listeners
    let dzToConfig = new Map();

    /* drop-zones registration management */
    function registerDropZone(dropZoneEl, type) {
        console.debug('registering drop-zone if absent');
        if (!typeToDropZones.has(type)) {
            typeToDropZones.set(type, new Set());
        }
        if (!typeToDropZones.get(type).has(dropZoneEl)) {
            typeToDropZones.get(type).add(dropZoneEl); 
        }
    }
    function unregisterDropZone(dropZoneEl, type) {
        typeToDropZones.get(type).delete(dropZoneEl);
        if (typeToDropZones.get(type).size === 0) {
            typeToDropZones.delete(type);
        }
    }

    /* functions to manage observing the dragged element and trigger custom drag-events */
    function watchDraggedElement() {
        armWindowScroller();
        const dropZones = typeToDropZones.get(draggedElType);
        for (const dz of dropZones) {
            dz.addEventListener(DRAGGED_ENTERED_EVENT_NAME, handleDraggedEntered);
            dz.addEventListener(DRAGGED_LEFT_EVENT_NAME, handleDraggedLeft);
            dz.addEventListener(DRAGGED_OVER_INDEX_EVENT_NAME, handleDraggedIsOverIndex);
        }
        window.addEventListener(DRAGGED_LEFT_DOCUMENT_EVENT_NAME, handleDrop);
        // it is important that we don't have an interval that is faster than the flip duration because it can cause elements to jump bach and forth
        const observationIntervalMs = Math.max(MIN_OBSERVATION_INTERVAL_MS, ...Array.from(dropZones.keys()).map(dz => dzToConfig.get(dz).dropAnimationDurationMs));
        observe(draggedEl, dropZones, observationIntervalMs);
    }
    function unWatchDraggedElement() {
        disarmWindowScroller();
        const dropZones = typeToDropZones.get(draggedElType);
        for (const dz of dropZones) {
            dz.removeEventListener(DRAGGED_ENTERED_EVENT_NAME, handleDraggedEntered);
            dz.removeEventListener(DRAGGED_LEFT_EVENT_NAME, handleDraggedLeft);
            dz.removeEventListener(DRAGGED_OVER_INDEX_EVENT_NAME, handleDraggedIsOverIndex);
        }
        window.removeEventListener(DRAGGED_LEFT_DOCUMENT_EVENT_NAME, handleDrop);
        unobserve();
    }

    /* custom drag-events handlers */
    function handleDraggedEntered(e) {
        console.debug('dragged entered', e.currentTarget, e.detail);
        let {items, dropFromOthersDisabled} = dzToConfig.get(e.currentTarget);
        if (dropFromOthersDisabled && e.currentTarget !== originDropZone) {
            console.debug('drop is currently disabled');
            return;
        }
        // this deals with another svelte related race condition. in rare occasions (super rapid operations) the list hasn't updated yet
        items = items.filter(i => i.id !== shadowElData.id);
        console.debug(`dragged entered items ${JSON.stringify(items)}`);
        const {index, isProximityBased} = e.detail.indexObj;
        shadowElIdx = (isProximityBased && index === e.currentTarget.children.length - 1)? index + 1 : index;
        shadowElDropZone = e.currentTarget;
        items.splice( shadowElIdx, 0, shadowElData);
        dispatchConsiderEvent(e.currentTarget, items);
    }
    function handleDraggedLeft(e) {
        console.debug('dragged left', e.currentTarget, e.detail);
        const {items, dropFromOthersDisabled} = dzToConfig.get(e.currentTarget);
        if (dropFromOthersDisabled && e.currentTarget !== originDropZone) {
            console.debug('drop is currently disabled');
            return;
        }
        items.splice(shadowElIdx, 1);
        shadowElIdx = undefined;
        shadowElDropZone = undefined;
        dispatchConsiderEvent(e.currentTarget, items);
    }
    function handleDraggedIsOverIndex(e) {
        console.debug('dragged is over index', e.currentTarget, e.detail);
        const {items, dropFromOthersDisabled} = dzToConfig.get(e.currentTarget);
        if (dropFromOthersDisabled && e.currentTarget !== originDropZone) {
            console.debug('drop is currently disabled');
            return;
        }
        const {index} = e.detail.indexObj;
        items.splice(shadowElIdx, 1);
        items.splice( index, 0, shadowElData);
        shadowElIdx = index;
        dispatchConsiderEvent(e.currentTarget, items);
    }

    /* global mouse/touch-events handlers */
    function handleMouseMove(e) {
        e.preventDefault();
        const c = e.touches? e.touches[0] : e;
        currentMousePosition = {x: c.clientX, y: c.clientY};
        draggedEl.style.transform = `translate3d(${currentMousePosition.x - dragStartMousePosition.x}px, ${currentMousePosition.y - dragStartMousePosition.y}px, 0)`;
    }

    function handleDrop() {
        console.debug('dropped');
        // cleanup
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('mouseup', handleDrop);
        window.removeEventListener('touchend', handleDrop);
        unWatchDraggedElement();
        moveDraggedElementToWasDroppedState(draggedEl);
        if (!!shadowElDropZone) { // it was dropped in a drop-zone
            console.debug('dropped in dz', shadowElDropZone);
            let {items, type} = dzToConfig.get(shadowElDropZone);
            styleInActiveDropZones(typeToDropZones.get(type));
            items = items.map(item => item.hasOwnProperty('isDndShadowItem')? draggedElData : item);
            function finalizeWithinZone() {
                dispatchFinalizeEvent(shadowElDropZone, items);
                if (shadowElDropZone !== originDropZone) {
                    // letting the origin drop zone know the element was permanently taken away
                    dispatchFinalizeEvent(originDropZone, dzToConfig.get(originDropZone).items);
                }
                shadowElDropZone.children[shadowElIdx].style.visibility = '';
                cleanupPostDrop();
                isWorkingOnPreviousDrag = false;
            }
            animateDraggedToFinalPosition(finalizeWithinZone);
        }
        else { // it needs to return to its place
            console.debug('no dz available');
            let {items, type} = dzToConfig.get(originDropZone);
            styleInActiveDropZones(typeToDropZones.get(type));
            items.splice(originIndex, 0, shadowElData);
            shadowElDropZone = originDropZone;
            shadowElIdx = originIndex;
            dispatchConsiderEvent(originDropZone, items);
            function finalizeBackToOrigin() {
                items.splice(originIndex, 1, draggedElData);
                dispatchFinalizeEvent(originDropZone, items);
                shadowElDropZone.children[shadowElIdx].style.visibility = '';
                cleanupPostDrop();
                isWorkingOnPreviousDrag = false;
            }
            window.setTimeout(() => animateDraggedToFinalPosition(finalizeBackToOrigin), 0);
        }
    }

    // helper function for handleDrop
    function animateDraggedToFinalPosition(callback) {
        const shadowElRect = shadowElDropZone.children[shadowElIdx].getBoundingClientRect();
        const newTransform = {
            x: shadowElRect.left - parseFloat(draggedEl.style.left),
            y: shadowElRect.top - parseFloat(draggedEl.style.top)
        };
        const {dropAnimationDurationMs} = dzToConfig.get(shadowElDropZone);
        const transition = `transform ${dropAnimationDurationMs}ms ease`;
        draggedEl.style.transition = draggedEl.style.transition? draggedEl.style.transition + "," + transition : transition;
        draggedEl.style.transform = `translate3d(${newTransform.x}px, ${newTransform.y}px, 0)`;
        window.setTimeout(callback, dropAnimationDurationMs);
    }

    /* cleanup */
    function cleanupPostDrop() {
        draggedEl.remove();
        draggedEl = undefined;
        draggedElData = undefined;
        draggedElType = undefined;
        originDropZone = undefined;
        originIndex = undefined;
        shadowElData = undefined;
        shadowElIdx = undefined;
        dragStartMousePosition = undefined;
        currentMousePosition = undefined;
    }

    /**
     * A Svelte custom action to turn any container to a dnd zone and all of its direct children to draggables
     * dispatches two events that the container is expected to react to by modifying its list of items,
     * which will then feed back in to this action via the update function
     *
     * @typedef {Object} Options
     * @property {Array} items - the list of items that was used to generate the children of the given node (the list used in the #each block
     * @property {string} [type] - the type of the dnd zone. children dragged from here can only be dropped in other zones of the same type, default to a base type
     * @property {number} [flipDurationMs] - if the list animated using flip (recommended), specifies the flip duration such that everything syncs with it without conflict, defaults to zero
     * @param {HTMLElement} node - the element to enhance
     * @param {Options} options
     * @return {{update: function, destroy: function}}
     */
    function dndzone(node, options) {
        const config =  {items: [], type: undefined, flipDurationMs: 0, dragDisabled: false, dropFromOthersDisabled: false};
        console.debug("dndzone good to go", {node, options, config});
        let elToIdx = new Map();
        // used before the actual drag starts
        let potentialDragTarget;

        function addMaybeListeners() {
            window.addEventListener('mousemove', handleMouseMoveMaybeDragStart, {passive: false});
            window.addEventListener('touchmove', handleMouseMoveMaybeDragStart, {passive: false, capture: false});
            window.addEventListener('mouseup', handleFalseAlarm, {passive: false});
            window.addEventListener('touchend', handleFalseAlarm, {passive: false});
        }
        function removeMaybeListeners() {
            window.removeEventListener('mousemove', handleMouseMoveMaybeDragStart);
            window.removeEventListener('touchmove', handleMouseMoveMaybeDragStart);
            window.removeEventListener('mouseup', handleFalseAlarm);
            window.removeEventListener('touchend', handleFalseAlarm);
        }
        function handleFalseAlarm() {
            removeMaybeListeners();
            potentialDragTarget = undefined;
            dragStartMousePosition = undefined;
            currentMousePosition = undefined;
        }

        function handleMouseMoveMaybeDragStart(e) {
            e.preventDefault();
            const c = e.touches? e.touches[0] : e;
            currentMousePosition = {x: c.clientX, y: c.clientY};
            if(Math.abs(currentMousePosition.x - dragStartMousePosition.x) >= MIN_MOVEMENT_BEFORE_DRAG_START_PX || Math.abs(currentMousePosition.y - dragStartMousePosition.y) >= MIN_MOVEMENT_BEFORE_DRAG_START_PX) {
                removeMaybeListeners();
                handleDragStart(potentialDragTarget);
                potentialDragTarget = undefined;
            }
        }
        function handleMouseDown(e) {
            const c = e.touches? e.touches[0] : e;
            dragStartMousePosition = {x: c.clientX, y:c.clientY};
            currentMousePosition = {...dragStartMousePosition};
            potentialDragTarget = e.currentTarget;
            addMaybeListeners();
        }

        function handleDragStart(dragTarget) {
            console.debug('drag start', dragTarget, {config});
            if (isWorkingOnPreviousDrag) {
                console.debug('cannot start a new drag before finalizing previous one');
                return;
            }
            isWorkingOnPreviousDrag = true;

            // initialising globals
            const currentIdx = elToIdx.get(dragTarget);
            originIndex = currentIdx;
            originDropZone = dragTarget.parentNode;
            const {items, type} = config;
            draggedElData = {...items[currentIdx]};
            draggedElType = type;
            shadowElData = {...draggedElData, isDndShadowItem: true};

            // creating the draggable element
            draggedEl = createDraggedElementFrom(dragTarget);
            document.body.appendChild(draggedEl);
            styleActiveDropZones(
                Array.from(typeToDropZones.get(config.type))
                .filter(dz => dz === originDropZone || !dzToConfig.get(dz).dropFromOthersDisabled)
            );

            // removing the original element by removing its data entry
            items.splice( currentIdx, 1);
            dispatchConsiderEvent(originDropZone, items);

            // handing over to global handlers - starting to watch the element
            window.addEventListener('mousemove', handleMouseMove, {passive: false});
            window.addEventListener('touchmove', handleMouseMove, {passive: false, capture: false});
            window.addEventListener('mouseup', handleDrop, {passive: false});
            window.addEventListener('touchend', handleDrop, {passive: false});
            watchDraggedElement();
        }

        function configure({items = [], flipDurationMs:dropAnimationDurationMs = 0, type:newType = DEFAULT_DROP_ZONE_TYPE, dragDisabled = false, dropFromOthersDisabled = false, ...rest }) {
            if (Object.keys(rest).length > 0) {
                console.warn(`dndzone will ignore unknown options`, rest);
            }
            config.dropAnimationDurationMs = dropAnimationDurationMs;
            if (config.type && newType !== config.type) {
                unregisterDropZone(node, config.type);
            }
            config.type = newType;
            registerDropZone(node, newType);

            config.items = items;

            config.dragDisabled = dragDisabled;

            if (isWorkingOnPreviousDrag && config.dropFromOthersDisabled !== dropFromOthersDisabled) {
                if (dropFromOthersDisabled) {
                    styleInActiveDropZones([node]);
                } else {
                    styleActiveDropZones([node]);
                }
            }
            config.dropFromOthersDisabled = dropFromOthersDisabled;
            dzToConfig.set(node, config);
            for (let idx = 0; idx < node.children.length; idx++) {
                const draggableEl = node.children[idx];
                styleDraggable(draggableEl, dragDisabled);
                if (config.items[idx].hasOwnProperty('isDndShadowItem')) {
                    morphDraggedElementToBeLike(draggedEl, draggableEl, currentMousePosition.x, currentMousePosition.y);
                    styleShadowEl(draggableEl);
                    continue;
                }
                draggableEl.removeEventListener('mousedown', handleMouseDown);
                draggableEl.removeEventListener('touchstart', handleMouseDown);
                if (!dragDisabled) {
                    draggableEl.addEventListener('mousedown', handleMouseDown);
                    draggableEl.addEventListener('touchstart', handleMouseDown);
                }
                // updating the idx
                elToIdx.set(draggableEl, idx);
            }
        }
        configure(options);

        return ({
            update: (newOptions) => {
                console.debug("dndzone will update", newOptions);
                configure(newOptions);
            },
            destroy: () => {
                console.debug("dndzone will destroy");
                unregisterDropZone(node, config.type);
                dzToConfig.delete(node);
            }
        });
    }

    /* src/components/EditH2Field.svelte generated by Svelte v3.23.2 */
    const file = "src/components/EditH2Field.svelte";

    // (10:4) {:else}
    function create_else_block(ctx) {
    	let h2;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			t = text(/*name*/ ctx[0]);
    			add_location(h2, file, 10, 6, 302);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			append_dev(h2, t);

    			if (!mounted) {
    				dispose = listen_dev(h2, "dblclick", /*dblclick_handler*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*name*/ 1) set_data_dev(t, /*name*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(10:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (2:2) {#if editH2Flag}
    function create_if_block(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "class", "eListName svelte-1u89s3m");
    			attr_dev(input, "type", "text");
    			add_location(input, file, 2, 4, 49);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*name*/ ctx[0]);
    			/*input_binding*/ ctx[7](input);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[6]),
    					listen_dev(input, "keydown", /*keydown_handler*/ ctx[8], false, false, false),
    					listen_dev(input, "blur", /*blur_handler*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*name*/ 1 && input.value !== /*name*/ ctx[0]) {
    				set_input_value(input, /*name*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[7](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(2:2) {#if editH2Flag}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (/*editH2Flag*/ ctx[2]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "editH2Field svelte-1u89s3m");
    			add_location(div, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	let { styles } = $$props;
    	let editField;
    	let editH2Flag = false;
    	const disbatch = createEventDispatcher();

    	async function editName() {
    		$$invalidate(2, editH2Flag = true);
    		await tick();
    		editField.focus();
    	}

    	function nameChanged() {
    		disbatch("nameChanged", { name: editField.value });
    		$$invalidate(2, editH2Flag = false);
    	}

    	const writable_props = ["name", "styles"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<EditH2Field> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("EditH2Field", $$slots, []);

    	function input_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			editField = $$value;
    			$$invalidate(1, editField);
    		});
    	}

    	const keydown_handler = e => {
    		if (e.code === "Enter") nameChanged();
    	};

    	const blur_handler = () => {
    		nameChanged();
    	};

    	const dblclick_handler = () => {
    		editName();
    	};

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("styles" in $$props) $$invalidate(5, styles = $$props.styles);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		tick,
    		name,
    		styles,
    		editField,
    		editH2Flag,
    		disbatch,
    		editName,
    		nameChanged
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("styles" in $$props) $$invalidate(5, styles = $$props.styles);
    		if ("editField" in $$props) $$invalidate(1, editField = $$props.editField);
    		if ("editH2Flag" in $$props) $$invalidate(2, editH2Flag = $$props.editH2Flag);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		name,
    		editField,
    		editH2Flag,
    		editName,
    		nameChanged,
    		styles,
    		input_input_handler,
    		input_binding,
    		keydown_handler,
    		blur_handler,
    		dblclick_handler
    	];
    }

    class EditH2Field extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0, styles: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditH2Field",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<EditH2Field> was created without expected prop 'name'");
    		}

    		if (/*styles*/ ctx[5] === undefined && !("styles" in props)) {
    			console.warn("<EditH2Field> was created without expected prop 'styles'");
    		}
    	}

    	get name() {
    		throw new Error("<EditH2Field>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<EditH2Field>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styles() {
    		throw new Error("<EditH2Field>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styles(value) {
    		throw new Error("<EditH2Field>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/EditPField.svelte generated by Svelte v3.23.2 */
    const file$1 = "src/components/EditPField.svelte";

    // (9:4) {:else}
    function create_else_block$1(ctx) {
    	let p;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*name*/ ctx[0]);
    			attr_dev(p, "class", "pListName svelte-kmol7a");
    			add_location(p, file$1, 9, 6, 282);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);

    			if (!mounted) {
    				dispose = listen_dev(p, "dblclick", /*dblclick_handler*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*name*/ 1) set_data_dev(t, /*name*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(9:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (2:2) {#if editH2Flag}
    function create_if_block$1(ctx) {
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			attr_dev(textarea, "class", "eListName svelte-kmol7a");
    			add_location(textarea, file$1, 2, 4, 49);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, textarea, anchor);
    			set_input_value(textarea, /*name*/ ctx[0]);
    			/*textarea_binding*/ ctx[7](textarea);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[6]),
    					listen_dev(textarea, "keydown", /*keydown_handler*/ ctx[8], false, false, false),
    					listen_dev(textarea, "blur", /*blur_handler*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*name*/ 1) {
    				set_input_value(textarea, /*name*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(textarea);
    			/*textarea_binding*/ ctx[7](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(2:2) {#if editH2Flag}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (/*editH2Flag*/ ctx[2]) return create_if_block$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "editH2Field svelte-kmol7a");
    			add_location(div, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	let { styles } = $$props;
    	let editField;
    	let editH2Flag = false;
    	const disbatch = createEventDispatcher();

    	async function editName() {
    		$$invalidate(2, editH2Flag = true);
    		await tick();
    		editField.focus();
    	}

    	function nameChanged() {
    		disbatch("nameChanged", { name: editField.value });
    		$$invalidate(2, editH2Flag = false);
    	}

    	const writable_props = ["name", "styles"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<EditPField> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("EditPField", $$slots, []);

    	function textarea_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	function textarea_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			editField = $$value;
    			$$invalidate(1, editField);
    		});
    	}

    	const keydown_handler = e => {
    		if (e.code === "Enter") nameChanged();
    	};

    	const blur_handler = () => {
    		nameChanged();
    	};

    	const dblclick_handler = () => {
    		editName();
    	};

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("styles" in $$props) $$invalidate(5, styles = $$props.styles);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		tick,
    		name,
    		styles,
    		editField,
    		editH2Flag,
    		disbatch,
    		editName,
    		nameChanged
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("styles" in $$props) $$invalidate(5, styles = $$props.styles);
    		if ("editField" in $$props) $$invalidate(1, editField = $$props.editField);
    		if ("editH2Flag" in $$props) $$invalidate(2, editH2Flag = $$props.editH2Flag);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		name,
    		editField,
    		editH2Flag,
    		editName,
    		nameChanged,
    		styles,
    		textarea_input_handler,
    		textarea_binding,
    		keydown_handler,
    		blur_handler,
    		dblclick_handler
    	];
    }

    class EditPField extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { name: 0, styles: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditPField",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<EditPField> was created without expected prop 'name'");
    		}

    		if (/*styles*/ ctx[5] === undefined && !("styles" in props)) {
    			console.warn("<EditPField> was created without expected prop 'styles'");
    		}
    	}

    	get name() {
    		throw new Error("<EditPField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<EditPField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styles() {
    		throw new Error("<EditPField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styles(value) {
    		throw new Error("<EditPField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/ToDoListApp.svelte generated by Svelte v3.23.2 */
    const file$2 = "src/components/ToDoListApp.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[14] = list;
    	child_ctx[15] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[16] = list;
    	child_ctx[17] = i;
    	return child_ctx;
    }

    // (15:6) {#if !todo.done}
    function create_if_block_1(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*todo*/ ctx[13].description + "";
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[9](/*todo*/ ctx[13], /*each_value_1*/ ctx[16], /*todo_index_1*/ ctx[17], ...args);
    	}

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("⃞  ");
    			t1 = text(t1_value);
    			add_location(p, file$2, 15, 8, 358);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);

    			if (!mounted) {
    				dispose = listen_dev(p, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*app*/ 1 && t1_value !== (t1_value = /*todo*/ ctx[13].description + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(15:6) {#if !todo.done}",
    		ctx
    	});

    	return block;
    }

    // (14:4) {#each app.todos as todo}
    function create_each_block_1(ctx) {
    	let if_block_anchor;
    	let if_block = !/*todo*/ ctx[13].done && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (!/*todo*/ ctx[13].done) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(14:4) {#each app.todos as todo}",
    		ctx
    	});

    	return block;
    }

    // (20:6) {#if todo.done}
    function create_if_block$2(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*todo*/ ctx[13].description + "";
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[10](/*todo*/ ctx[13], /*each_value*/ ctx[14], /*todo_index*/ ctx[15], ...args);
    	}

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("☑ ");
    			t1 = text(t1_value);
    			add_location(p, file$2, 20, 8, 529);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);

    			if (!mounted) {
    				dispose = listen_dev(p, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*app*/ 1 && t1_value !== (t1_value = /*todo*/ ctx[13].description + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(20:6) {#if todo.done}",
    		ctx
    	});

    	return block;
    }

    // (19:4) {#each app.todos as todo}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*todo*/ ctx[13].done && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*todo*/ ctx[13].done) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(19:4) {#each app.todos as todo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div1;
    	let edith2field;
    	let t0;
    	let input;
    	let t1;
    	let div0;
    	let t2;
    	let current;
    	let mounted;
    	let dispose;

    	edith2field = new EditH2Field({
    			props: {
    				name: /*app*/ ctx[0].name,
    				styles: /*app*/ ctx[0].styles
    			},
    			$$inline: true
    		});

    	edith2field.$on("nameChanged", /*nameChanged*/ ctx[3]);
    	let each_value_1 = /*app*/ ctx[0].todos;
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*app*/ ctx[0].todos;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			create_component(edith2field.$$.fragment);
    			t0 = space();
    			input = element("input");
    			t1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(input, "class", "todoInput svelte-1xc8o5z");
    			attr_dev(input, "type", "text");
    			add_location(input, file$2, 6, 2, 123);
    			attr_dev(div0, "class", "todoContainer svelte-1xc8o5z");
    			add_location(div0, file$2, 12, 2, 268);
    			attr_dev(div1, "class", "ToDoList svelte-1xc8o5z");
    			add_location(div1, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			mount_component(edith2field, div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, input);
    			set_input_value(input, /*newToDo*/ ctx[1]);
    			append_dev(div1, t1);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			append_dev(div0, t2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[7]),
    					listen_dev(input, "keydown", /*keydown_handler*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const edith2field_changes = {};
    			if (dirty & /*app*/ 1) edith2field_changes.name = /*app*/ ctx[0].name;
    			if (dirty & /*app*/ 1) edith2field_changes.styles = /*app*/ ctx[0].styles;
    			edith2field.$set(edith2field_changes);

    			if (dirty & /*newToDo*/ 2 && input.value !== /*newToDo*/ ctx[1]) {
    				set_input_value(input, /*newToDo*/ ctx[1]);
    			}

    			if (dirty & /*app, setDone*/ 17) {
    				each_value_1 = /*app*/ ctx[0].todos;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div0, t2);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*app, setNotDone*/ 33) {
    				each_value = /*app*/ ctx[0].todos;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(edith2field.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(edith2field.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(edith2field);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { app } = $$props;
    	let { item } = $$props;
    	let newToDo;
    	const disbatch = createEventDispatcher();

    	function createNewTodo() {
    		app.todos.push({ description: newToDo, done: false });
    		$$invalidate(1, newToDo = "");
    		$$invalidate(0, app);
    		saveApp();
    	}

    	function saveApp() {
    		disbatch("appUpdate", { item: item.id, app });
    	}

    	function nameChanged(e) {
    		$$invalidate(0, app.name = e.detail.name, app);
    		saveApp();
    	}

    	function setDone(todo) {
    		todo.done = true;
    		var td = new Date();
    		todo.description += " @done " + (td.getMonth() + 1) + "/" + td.getDay() + "/" + td.getFullYear();
    		saveApp();
    	}

    	function setNotDone(todo) {
    		todo.done = false;
    		var dtReg = /\s+\@done\s+\d+\/\d+\/\d+/;
    		todo.description = todo.description.replace(dtReg, "");
    		saveApp();
    	}

    	const writable_props = ["app", "item"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ToDoListApp> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ToDoListApp", $$slots, []);

    	function input_input_handler() {
    		newToDo = this.value;
    		$$invalidate(1, newToDo);
    	}

    	const keydown_handler = e => {
    		if (e.code === "Enter") createNewTodo();
    	};

    	const click_handler = (todo, each_value_1, todo_index_1, e) => {
    		$$invalidate(0, each_value_1[todo_index_1].done = true, app);
    		setDone(todo);
    	};

    	const click_handler_1 = (todo, each_value, todo_index, e) => {
    		$$invalidate(0, each_value[todo_index].done = false, app);
    		setNotDone(todo);
    	};

    	$$self.$set = $$props => {
    		if ("app" in $$props) $$invalidate(0, app = $$props.app);
    		if ("item" in $$props) $$invalidate(6, item = $$props.item);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		EditH2Field,
    		app,
    		item,
    		newToDo,
    		disbatch,
    		createNewTodo,
    		saveApp,
    		nameChanged,
    		setDone,
    		setNotDone
    	});

    	$$self.$inject_state = $$props => {
    		if ("app" in $$props) $$invalidate(0, app = $$props.app);
    		if ("item" in $$props) $$invalidate(6, item = $$props.item);
    		if ("newToDo" in $$props) $$invalidate(1, newToDo = $$props.newToDo);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		app,
    		newToDo,
    		createNewTodo,
    		nameChanged,
    		setDone,
    		setNotDone,
    		item,
    		input_input_handler,
    		keydown_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class ToDoListApp extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { app: 0, item: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ToDoListApp",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*app*/ ctx[0] === undefined && !("app" in props)) {
    			console.warn("<ToDoListApp> was created without expected prop 'app'");
    		}

    		if (/*item*/ ctx[6] === undefined && !("item" in props)) {
    			console.warn("<ToDoListApp> was created without expected prop 'item'");
    		}
    	}

    	get app() {
    		throw new Error("<ToDoListApp>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set app(value) {
    		throw new Error("<ToDoListApp>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get item() {
    		throw new Error("<ToDoListApp>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<ToDoListApp>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Item.svelte generated by Svelte v3.23.2 */
    const file$3 = "src/components/Item.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	return child_ctx;
    }

    // (6:2) {#if edit}
    function create_if_block$3(ctx) {
    	let div4;
    	let div3;
    	let edith2field;
    	let t0;
    	let editpfield;
    	let t1;
    	let div2;
    	let t2;
    	let input;
    	let t3;
    	let div0;
    	let button0;
    	let t5;
    	let div1;
    	let button1;
    	let t7;
    	let button2;
    	let t9;
    	let current;
    	let mounted;
    	let dispose;

    	edith2field = new EditH2Field({
    			props: {
    				name: /*itemInfo*/ ctx[0].name,
    				styles: /*styles*/ ctx[1]
    			},
    			$$inline: true
    		});

    	edith2field.$on("nameChanged", /*nameChanged*/ ctx[7]);

    	editpfield = new EditPField({
    			props: {
    				name: /*itemInfo*/ ctx[0].description,
    				styles: /*styles*/ ctx[1]
    			},
    			$$inline: true
    		});

    	editpfield.$on("nameChanged", /*descriptionChanged*/ ctx[8]);
    	let each_value_1 = /*itemInfo*/ ctx[0].apps;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block = /*itemInfo*/ ctx[0].notes.length !== 0 && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			create_component(edith2field.$$.fragment);
    			t0 = space();
    			create_component(editpfield.$$.fragment);
    			t1 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			input = element("input");
    			t3 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Todo List";
    			t5 = space();
    			div1 = element("div");
    			button1 = element("button");
    			button1.textContent = "Save";
    			t7 = space();
    			button2 = element("button");
    			button2.textContent = "Delete";
    			t9 = space();
    			if (if_block) if_block.c();
    			attr_dev(input, "class", "newMsg svelte-1l8qizt");
    			attr_dev(input, "type", "text");
    			add_location(input, file$3, 25, 10, 874);
    			attr_dev(button0, "class", "svelte-1l8qizt");
    			add_location(button0, file$3, 32, 12, 1102);
    			attr_dev(div0, "class", "appButtons svelte-1l8qizt");
    			add_location(div0, file$3, 31, 10, 1065);
    			attr_dev(button1, "class", "svelte-1l8qizt");
    			add_location(button1, file$3, 35, 12, 1218);
    			attr_dev(button2, "class", "svelte-1l8qizt");
    			add_location(button2, file$3, 36, 12, 1272);
    			attr_dev(div1, "class", "buttonRow svelte-1l8qizt");
    			add_location(div1, file$3, 34, 10, 1182);
    			attr_dev(div2, "class", "itemContainer svelte-1l8qizt");
    			add_location(div2, file$3, 21, 8, 678);
    			attr_dev(div3, "class", "editDialog svelte-1l8qizt");
    			set_style(div3, "background-color", /*styles*/ ctx[1].dialogBGColor);
    			set_style(div3, "color", /*styles*/ ctx[1].dialogTextColor);
    			add_location(div3, file$3, 7, 6, 243);
    			attr_dev(div4, "class", "editDialogBG svelte-1l8qizt");
    			add_location(div4, file$3, 6, 4, 210);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			mount_component(edith2field, div3, null);
    			append_dev(div3, t0);
    			mount_component(editpfield, div3, null);
    			append_dev(div3, t1);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append_dev(div2, t2);
    			append_dev(div2, input);
    			set_input_value(input, /*newMsg*/ ctx[3]);
    			append_dev(div2, t3);
    			append_dev(div2, div0);
    			append_dev(div0, button0);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, button1);
    			append_dev(div1, t7);
    			append_dev(div1, button2);
    			append_dev(div2, t9);
    			if (if_block) if_block.m(div2, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[13]),
    					listen_dev(input, "keydown", /*keydown_handler*/ ctx[14], false, false, false),
    					listen_dev(button0, "click", /*createToDoList*/ ctx[10], false, false, false),
    					listen_dev(button1, "click", /*saveItem*/ ctx[6], false, false, false),
    					listen_dev(button2, "click", /*deleteItem*/ ctx[5], false, false, false),
    					listen_dev(div3, "save", /*saveItem*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const edith2field_changes = {};
    			if (dirty & /*itemInfo*/ 1) edith2field_changes.name = /*itemInfo*/ ctx[0].name;
    			if (dirty & /*styles*/ 2) edith2field_changes.styles = /*styles*/ ctx[1];
    			edith2field.$set(edith2field_changes);
    			const editpfield_changes = {};
    			if (dirty & /*itemInfo*/ 1) editpfield_changes.name = /*itemInfo*/ ctx[0].description;
    			if (dirty & /*styles*/ 2) editpfield_changes.styles = /*styles*/ ctx[1];
    			editpfield.$set(editpfield_changes);

    			if (dirty & /*itemInfo, appUpdate*/ 2049) {
    				each_value_1 = /*itemInfo*/ ctx[0].apps;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div2, t2);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*newMsg*/ 8 && input.value !== /*newMsg*/ ctx[3]) {
    				set_input_value(input, /*newMsg*/ ctx[3]);
    			}

    			if (/*itemInfo*/ ctx[0].notes.length !== 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(div2, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (!current || dirty & /*styles*/ 2) {
    				set_style(div3, "background-color", /*styles*/ ctx[1].dialogBGColor);
    			}

    			if (!current || dirty & /*styles*/ 2) {
    				set_style(div3, "color", /*styles*/ ctx[1].dialogTextColor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(edith2field.$$.fragment, local);
    			transition_in(editpfield.$$.fragment, local);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(edith2field.$$.fragment, local);
    			transition_out(editpfield.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_component(edith2field);
    			destroy_component(editpfield);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(6:2) {#if edit}",
    		ctx
    	});

    	return block;
    }

    // (23:10) {#each itemInfo.apps as app}
    function create_each_block_1$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*app*/ ctx[21].code;

    	function switch_props(ctx) {
    		return {
    			props: {
    				app: /*app*/ ctx[21],
    				item: /*itemInfo*/ ctx[0]
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    		switch_instance.$on("appUpdate", /*appUpdate*/ ctx[11]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty & /*itemInfo*/ 1) switch_instance_changes.app = /*app*/ ctx[21];
    			if (dirty & /*itemInfo*/ 1) switch_instance_changes.item = /*itemInfo*/ ctx[0];

    			if (switch_value !== (switch_value = /*app*/ ctx[21].code)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					switch_instance.$on("appUpdate", /*appUpdate*/ ctx[11]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(23:10) {#each itemInfo.apps as app}",
    		ctx
    	});

    	return block;
    }

    // (39:10) {#if itemInfo.notes.length !== 0}
    function create_if_block_1$1(ctx) {
    	let each_1_anchor;
    	let each_value = /*itemInfo*/ ctx[0].notes;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*itemInfo*/ 1) {
    				each_value = /*itemInfo*/ ctx[0].notes;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(39:10) {#if itemInfo.notes.length !== 0}",
    		ctx
    	});

    	return block;
    }

    // (50:16) {#if note.type === 'text'}
    function create_if_block_2(ctx) {
    	let p;
    	let t_value = /*note*/ ctx[18].info + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "noteText svelte-1l8qizt");
    			add_location(p, file$3, 50, 18, 1779);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*itemInfo*/ 1 && t_value !== (t_value = /*note*/ ctx[18].info + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(50:16) {#if note.type === 'text'}",
    		ctx
    	});

    	return block;
    }

    // (40:12) {#each itemInfo.notes as note}
    function create_each_block$1(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let t0_value = /*note*/ ctx[18].date + "";
    	let t0;
    	let t1;
    	let div1;
    	let t2_value = /*note*/ ctx[18].owner + "";
    	let t2;
    	let t3;
    	let t4;
    	let if_block = /*note*/ ctx[18].type === "text" && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			if (if_block) if_block.c();
    			t4 = space();
    			attr_dev(div0, "class", "noteDate svelte-1l8qizt");
    			add_location(div0, file$3, 42, 18, 1514);
    			attr_dev(div1, "class", "noteWriter svelte-1l8qizt");
    			add_location(div1, file$3, 45, 18, 1612);
    			attr_dev(div2, "class", "noteHeader svelte-1l8qizt");
    			add_location(div2, file$3, 41, 16, 1471);
    			attr_dev(div3, "class", "note svelte-1l8qizt");
    			add_location(div3, file$3, 40, 14, 1436);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, t2);
    			append_dev(div3, t3);
    			if (if_block) if_block.m(div3, null);
    			append_dev(div3, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*itemInfo*/ 1 && t0_value !== (t0_value = /*note*/ ctx[18].date + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*itemInfo*/ 1 && t2_value !== (t2_value = /*note*/ ctx[18].owner + "")) set_data_dev(t2, t2_value);

    			if (/*note*/ ctx[18].type === "text") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(div3, t4);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(40:12) {#each itemInfo.notes as note}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let h2;
    	let t0_value = /*itemInfo*/ ctx[0].name + "";
    	let t0;
    	let t1;
    	let p;
    	let t2_value = /*itemInfo*/ ctx[0].description + "";
    	let t2;
    	let t3;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*edit*/ ctx[2] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			p = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			if (if_block) if_block.c();
    			attr_dev(h2, "class", "svelte-1l8qizt");
    			add_location(h2, file$3, 3, 2, 136);
    			add_location(p, file$3, 4, 2, 163);
    			attr_dev(div, "class", "item svelte-1l8qizt");
    			set_style(div, "background-color", /*styles*/ ctx[1].itembgcolor);
    			set_style(div, "color", /*styles*/ ctx[1].itemtextcolor);
    			add_location(div, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(h2, t0);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(p, t2);
    			append_dev(div, t3);
    			if (if_block) if_block.m(div, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div, "dblclick", /*editItem*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*itemInfo*/ 1) && t0_value !== (t0_value = /*itemInfo*/ ctx[0].name + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*itemInfo*/ 1) && t2_value !== (t2_value = /*itemInfo*/ ctx[0].description + "")) set_data_dev(t2, t2_value);

    			if (/*edit*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*edit*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*styles*/ 2) {
    				set_style(div, "background-color", /*styles*/ ctx[1].itembgcolor);
    			}

    			if (!current || dirty & /*styles*/ 2) {
    				set_style(div, "color", /*styles*/ ctx[1].itemtextcolor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { styles } = $$props;
    	let { itemInfo } = $$props;
    	let { user } = $$props;
    	let edit = false;
    	let editName = false;
    	let editNameField;
    	let newMsg;
    	const disbatch = createEventDispatcher();

    	function editItem(e) {
    		$$invalidate(2, edit = true);
    	}

    	function deleteItem(e) {
    		disbatch("deleteItem", { item: itemInfo.id });
    	}

    	function saveItem(e) {
    		$$invalidate(2, edit = false);
    	}

    	function nameChanged(e) {
    		$$invalidate(0, itemInfo.name = e.detail.name, itemInfo);
    	}

    	function descriptionChanged(e) {
    		$$invalidate(0, itemInfo.description = e.detail.name, itemInfo);
    	}

    	function createNewTextMsg() {
    		var td = new Date();

    		var tdate = td.getDate() + "/" + (td.getDay().toString().length === 1
    		? "0" + td.getDay()
    		: td.getDay()) + "/" + td.getFullYear() + " " + td.getHours() + ":" + (td.getMinutes().toString().length === 1
    		? "0" + td.getMinutes()
    		: td.getMinutes()) + ":" + (td.getSeconds().toString().length === 1
    		? "0" + td.getSeconds()
    		: td.getSeconds());

    		disbatch("newItemMsg", {
    			item: itemInfo.id,
    			msg: {
    				id: 100,
    				date: tdate,
    				owner: user.name,
    				type: "text",
    				info: typeof newMsg !== "undefined" ? newMsg : ""
    			}
    		});

    		$$invalidate(3, newMsg = "");
    	}

    	function createToDoList() {
    		var newID = 0;

    		itemInfo.apps.map(app => {
    			if (app.id > newID) newID = newID + 1;
    		});

    		disbatch("newItemApp", {
    			item: itemInfo.id,
    			app: {
    				id: newID + 1,
    				name: itemInfo.name + ": " + "ToDoListApp",
    				code: ToDoListApp,
    				styles: [],
    				todos: []
    			}
    		});
    	}

    	function appUpdate(e) {
    		disbatch("appUpdate", e.detail);
    	}

    	const writable_props = ["styles", "itemInfo", "user"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Item> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Item", $$slots, []);

    	function input_input_handler() {
    		newMsg = this.value;
    		$$invalidate(3, newMsg);
    	}

    	const keydown_handler = e => {
    		if (e.code === "Enter") createNewTextMsg();
    	};

    	$$self.$set = $$props => {
    		if ("styles" in $$props) $$invalidate(1, styles = $$props.styles);
    		if ("itemInfo" in $$props) $$invalidate(0, itemInfo = $$props.itemInfo);
    		if ("user" in $$props) $$invalidate(12, user = $$props.user);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		EditH2Field,
    		EditPField,
    		ToDoListApp,
    		styles,
    		itemInfo,
    		user,
    		edit,
    		editName,
    		editNameField,
    		newMsg,
    		disbatch,
    		editItem,
    		deleteItem,
    		saveItem,
    		nameChanged,
    		descriptionChanged,
    		createNewTextMsg,
    		createToDoList,
    		appUpdate
    	});

    	$$self.$inject_state = $$props => {
    		if ("styles" in $$props) $$invalidate(1, styles = $$props.styles);
    		if ("itemInfo" in $$props) $$invalidate(0, itemInfo = $$props.itemInfo);
    		if ("user" in $$props) $$invalidate(12, user = $$props.user);
    		if ("edit" in $$props) $$invalidate(2, edit = $$props.edit);
    		if ("editName" in $$props) editName = $$props.editName;
    		if ("editNameField" in $$props) editNameField = $$props.editNameField;
    		if ("newMsg" in $$props) $$invalidate(3, newMsg = $$props.newMsg);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		itemInfo,
    		styles,
    		edit,
    		newMsg,
    		editItem,
    		deleteItem,
    		saveItem,
    		nameChanged,
    		descriptionChanged,
    		createNewTextMsg,
    		createToDoList,
    		appUpdate,
    		user,
    		input_input_handler,
    		keydown_handler
    	];
    }

    class Item extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { styles: 1, itemInfo: 0, user: 12 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Item",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*styles*/ ctx[1] === undefined && !("styles" in props)) {
    			console.warn("<Item> was created without expected prop 'styles'");
    		}

    		if (/*itemInfo*/ ctx[0] === undefined && !("itemInfo" in props)) {
    			console.warn("<Item> was created without expected prop 'itemInfo'");
    		}

    		if (/*user*/ ctx[12] === undefined && !("user" in props)) {
    			console.warn("<Item> was created without expected prop 'user'");
    		}
    	}

    	get styles() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styles(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get itemInfo() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set itemInfo(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get user() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set user(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/List.svelte generated by Svelte v3.23.2 */
    const file$4 = "src/components/List.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    // (19:4) {#each items as item(item.id)}
    function create_each_block$2(key_1, ctx) {
    	let first;
    	let item;
    	let current;

    	item = new Item({
    			props: {
    				itemInfo: /*item*/ ctx[18],
    				styles: /*styles*/ ctx[1],
    				user: /*user*/ ctx[2]
    			},
    			$$inline: true
    		});

    	item.$on("deleteItem", /*deleteItem*/ ctx[6]);
    	item.$on("newItemMsg", /*newItemMsg*/ ctx[8]);
    	item.$on("newItemApp", /*newItemApp*/ ctx[9]);
    	item.$on("appUpdate", /*appUpdate*/ ctx[10]);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(item.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(item, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const item_changes = {};
    			if (dirty & /*items*/ 8) item_changes.itemInfo = /*item*/ ctx[18];
    			if (dirty & /*styles*/ 2) item_changes.styles = /*styles*/ ctx[1];
    			if (dirty & /*user*/ 4) item_changes.user = /*user*/ ctx[2];
    			item.$set(item_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(item.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(item.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(item, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(19:4) {#each items as item(item.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div2;
    	let div0;
    	let edith2field;
    	let t0;
    	let span0;
    	let t2;
    	let span1;
    	let t4;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let dndzone_action;
    	let current;
    	let mounted;
    	let dispose;

    	edith2field = new EditH2Field({
    			props: {
    				name: /*listInfo*/ ctx[0].name,
    				styles: /*styles*/ ctx[1]
    			},
    			$$inline: true
    		});

    	edith2field.$on("nameChanged", /*nameChanged*/ ctx[7]);
    	let each_value = /*items*/ ctx[3];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*item*/ ctx[18].id;
    	validate_each_keys(ctx, each_value, get_each_context$2, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			create_component(edith2field.$$.fragment);
    			t0 = space();
    			span0 = element("span");
    			span0.textContent = "-";
    			t2 = space();
    			span1 = element("span");
    			span1.textContent = "+";
    			t4 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(span0, "class", "remove svelte-1hd2ozo");
    			add_location(span0, file$4, 7, 4, 237);
    			attr_dev(span1, "class", "add svelte-1hd2ozo");
    			add_location(span1, file$4, 10, 4, 317);
    			attr_dev(div0, "class", "listheader svelte-1hd2ozo");
    			add_location(div0, file$4, 1, 2, 100);
    			attr_dev(div1, "class", "itemcontainer svelte-1hd2ozo");
    			add_location(div1, file$4, 14, 2, 398);
    			attr_dev(div2, "class", "list svelte-1hd2ozo");
    			set_style(div2, "background-color", /*styles*/ ctx[1].listbgcolor);
    			set_style(div2, "color", /*styles*/ ctx[1].listtextcolor);
    			add_location(div2, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			mount_component(edith2field, div0, null);
    			append_dev(div0, t0);
    			append_dev(div0, span0);
    			append_dev(div0, t2);
    			append_dev(div0, span1);
    			append_dev(div2, t4);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(span0, "click", /*click_handler*/ ctx[12], false, false, false),
    					listen_dev(span1, "click", /*click_handler_1*/ ctx[13], false, false, false),
    					action_destroyer(dndzone_action = dndzone.call(null, div1, { items: /*items*/ ctx[3] })),
    					listen_dev(div1, "consider", /*handleSort*/ ctx[11], false, false, false),
    					listen_dev(div1, "finalize", /*handleSort*/ ctx[11], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const edith2field_changes = {};
    			if (dirty & /*listInfo*/ 1) edith2field_changes.name = /*listInfo*/ ctx[0].name;
    			if (dirty & /*styles*/ 2) edith2field_changes.styles = /*styles*/ ctx[1];
    			edith2field.$set(edith2field_changes);

    			if (dirty & /*items, styles, user, deleteItem, newItemMsg, newItemApp, appUpdate*/ 1870) {
    				const each_value = /*items*/ ctx[3];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$2, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div1, outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
    				check_outros();
    			}

    			if (dndzone_action && is_function(dndzone_action.update) && dirty & /*items*/ 8) dndzone_action.update.call(null, { items: /*items*/ ctx[3] });

    			if (!current || dirty & /*styles*/ 2) {
    				set_style(div2, "background-color", /*styles*/ ctx[1].listbgcolor);
    			}

    			if (!current || dirty & /*styles*/ 2) {
    				set_style(div2, "color", /*styles*/ ctx[1].listtextcolor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(edith2field.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(edith2field.$$.fragment, local);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(edith2field);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const flipDurationMs = 300;

    function instance$4($$self, $$props, $$invalidate) {
    	let { listInfo = { id: 0, items: [] } } = $$props;
    	let { styles } = $$props;
    	let { user } = $$props;
    	let editNameFlag = false;
    	let editField;
    	let items = listInfo.items;
    	const disbatch = createEventDispatcher();

    	onMount(() => {
    		$$invalidate(3, items = listInfo.items);
    	});

    	beforeUpdate(() => {
    		$$invalidate(3, items = listInfo.items);
    	});

    	async function addItem() {
    		disbatch("addItem", { list: listInfo.id });
    	}

    	async function deleteList() {
    		disbatch("deleteList", { list: listInfo.id });
    	}

    	async function editName() {
    		editNameFlag = true;
    		await tick();
    		editField.focus();
    	}

    	function deleteItem(e) {
    		disbatch("deleteItem", { item: e.detail.item, list: listInfo.id });
    	}

    	function nameChanged(e) {
    		$$invalidate(0, listInfo.name = e.detail.name, listInfo);
    	}

    	function newItemMsg(e) {
    		disbatch("newItemMsg", {
    			list: listInfo.id,
    			item: e.detail.item,
    			msg: e.detail.msg
    		});
    	}

    	function newItemApp(e) {
    		disbatch("newItemApp", {
    			list: listInfo.id,
    			item: e.detail.item,
    			app: e.detail.app
    		});
    	}

    	function appUpdate(e) {
    		disbatch("appUpdate", {
    			list: listInfo.id,
    			item: e.detail.item,
    			app: e.detail.app
    		});
    	}

    	function handleSort(e) {
    		$$invalidate(0, listInfo.items = e.detail.items, listInfo);
    		$$invalidate(0, listInfo);
    		disbatch("listUpdate", { list: listInfo });
    	}

    	const writable_props = ["listInfo", "styles", "user"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<List> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("List", $$slots, []);

    	const click_handler = () => {
    		deleteList();
    	};

    	const click_handler_1 = () => {
    		addItem();
    	};

    	$$self.$set = $$props => {
    		if ("listInfo" in $$props) $$invalidate(0, listInfo = $$props.listInfo);
    		if ("styles" in $$props) $$invalidate(1, styles = $$props.styles);
    		if ("user" in $$props) $$invalidate(2, user = $$props.user);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		tick,
    		onMount,
    		beforeUpdate,
    		flip,
    		dndzone,
    		EditH2Field,
    		Item,
    		listInfo,
    		styles,
    		user,
    		editNameFlag,
    		editField,
    		items,
    		flipDurationMs,
    		disbatch,
    		addItem,
    		deleteList,
    		editName,
    		deleteItem,
    		nameChanged,
    		newItemMsg,
    		newItemApp,
    		appUpdate,
    		handleSort
    	});

    	$$self.$inject_state = $$props => {
    		if ("listInfo" in $$props) $$invalidate(0, listInfo = $$props.listInfo);
    		if ("styles" in $$props) $$invalidate(1, styles = $$props.styles);
    		if ("user" in $$props) $$invalidate(2, user = $$props.user);
    		if ("editNameFlag" in $$props) editNameFlag = $$props.editNameFlag;
    		if ("editField" in $$props) editField = $$props.editField;
    		if ("items" in $$props) $$invalidate(3, items = $$props.items);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		listInfo,
    		styles,
    		user,
    		items,
    		addItem,
    		deleteList,
    		deleteItem,
    		nameChanged,
    		newItemMsg,
    		newItemApp,
    		appUpdate,
    		handleSort,
    		click_handler,
    		click_handler_1
    	];
    }

    class List extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { listInfo: 0, styles: 1, user: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "List",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*styles*/ ctx[1] === undefined && !("styles" in props)) {
    			console.warn("<List> was created without expected prop 'styles'");
    		}

    		if (/*user*/ ctx[2] === undefined && !("user" in props)) {
    			console.warn("<List> was created without expected prop 'user'");
    		}
    	}

    	get listInfo() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set listInfo(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styles() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styles(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get user() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set user(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/ListContainer.svelte generated by Svelte v3.23.2 */
    const file$5 = "src/components/ListContainer.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (2:2) {#if typeof lists === 'object'}
    function create_if_block$4(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*lists*/ ctx[0].lists;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lists, styles, user, dispatch*/ 15) {
    				each_value = /*lists*/ ctx[0].lists;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(2:2) {#if typeof lists === 'object'}",
    		ctx
    	});

    	return block;
    }

    // (3:4) {#each lists.lists as list }
    function create_each_block$3(ctx) {
    	let list;
    	let current;

    	list = new List({
    			props: {
    				listInfo: /*list*/ ctx[12],
    				styles: /*styles*/ ctx[1],
    				user: /*user*/ ctx[2]
    			},
    			$$inline: true
    		});

    	list.$on("deleteList", /*deleteList_handler*/ ctx[4]);
    	list.$on("addItem", /*addItem_handler*/ ctx[5]);
    	list.$on("deleteItem", /*deleteItem_handler*/ ctx[6]);
    	list.$on("newItemMsg", /*newItemMsg_handler*/ ctx[7]);
    	list.$on("newItemApp", /*newItemApp_handler*/ ctx[8]);
    	list.$on("appUpdate", /*appUpdate_handler*/ ctx[9]);
    	list.$on("listUpdate", /*listUpdate_handler*/ ctx[10]);

    	const block = {
    		c: function create() {
    			create_component(list.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(list, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const list_changes = {};
    			if (dirty & /*lists*/ 1) list_changes.listInfo = /*list*/ ctx[12];
    			if (dirty & /*styles*/ 2) list_changes.styles = /*styles*/ ctx[1];
    			if (dirty & /*user*/ 4) list_changes.user = /*user*/ ctx[2];
    			list.$set(list_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(list.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(list.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(list, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(3:4) {#each lists.lists as list }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div1;
    	let t0;
    	let div0;
    	let p;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = typeof /*lists*/ ctx[0] === "object" && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "+ New List";
    			add_location(p, file$5, 19, 4, 829);
    			attr_dev(div0, "id", "addList");
    			attr_dev(div0, "class", "svelte-vk0zem");
    			add_location(div0, file$5, 16, 2, 750);
    			attr_dev(div1, "id", "ListsContainer");
    			set_style(div1, "background-color", /*styles*/ ctx[1].listcontainercolor);
    			attr_dev(div1, "class", "svelte-vk0zem");
    			add_location(div1, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*click_handler*/ ctx[11], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (typeof /*lists*/ ctx[0] === "object") {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*lists*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*styles*/ 2) {
    				set_style(div1, "background-color", /*styles*/ ctx[1].listcontainercolor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { lists } = $$props;
    	let { styles } = $$props;
    	let { user } = $$props;
    	const dispatch = createEventDispatcher();
    	const writable_props = ["lists", "styles", "user"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ListContainer> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ListContainer", $$slots, []);

    	const deleteList_handler = e => {
    		dispatch("deleteList", e.detail);
    	};

    	const addItem_handler = e => {
    		dispatch("additem", e.detail);
    	};

    	const deleteItem_handler = e => {
    		dispatch("deleteItem", e.detail);
    	};

    	const newItemMsg_handler = e => {
    		dispatch("newItemMsg", e.detail);
    	};

    	const newItemApp_handler = e => {
    		dispatch("newItemApp", e.detail);
    	};

    	const appUpdate_handler = e => {
    		dispatch("appUpdate", e.detail);
    	};

    	const listUpdate_handler = e => {
    		dispatch("listUpdate", e.detail);
    	};

    	const click_handler = e => {
    		dispatch("addlist", {});
    	};

    	$$self.$set = $$props => {
    		if ("lists" in $$props) $$invalidate(0, lists = $$props.lists);
    		if ("styles" in $$props) $$invalidate(1, styles = $$props.styles);
    		if ("user" in $$props) $$invalidate(2, user = $$props.user);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		tick,
    		List,
    		lists,
    		styles,
    		user,
    		dispatch
    	});

    	$$self.$inject_state = $$props => {
    		if ("lists" in $$props) $$invalidate(0, lists = $$props.lists);
    		if ("styles" in $$props) $$invalidate(1, styles = $$props.styles);
    		if ("user" in $$props) $$invalidate(2, user = $$props.user);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		lists,
    		styles,
    		user,
    		dispatch,
    		deleteList_handler,
    		addItem_handler,
    		deleteItem_handler,
    		newItemMsg_handler,
    		newItemApp_handler,
    		appUpdate_handler,
    		listUpdate_handler,
    		click_handler
    	];
    }

    class ListContainer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { lists: 0, styles: 1, user: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ListContainer",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*lists*/ ctx[0] === undefined && !("lists" in props)) {
    			console.warn("<ListContainer> was created without expected prop 'lists'");
    		}

    		if (/*styles*/ ctx[1] === undefined && !("styles" in props)) {
    			console.warn("<ListContainer> was created without expected prop 'styles'");
    		}

    		if (/*user*/ ctx[2] === undefined && !("user" in props)) {
    			console.warn("<ListContainer> was created without expected prop 'user'");
    		}
    	}

    	get lists() {
    		throw new Error("<ListContainer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lists(value) {
    		throw new Error("<ListContainer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styles() {
    		throw new Error("<ListContainer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styles(value) {
    		throw new Error("<ListContainer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get user() {
    		throw new Error("<ListContainer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set user(value) {
    		throw new Error("<ListContainer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Board.svelte generated by Svelte v3.23.2 */
    const file$6 = "src/components/Board.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i];
    	child_ctx[28] = list;
    	child_ctx[29] = i;
    	return child_ctx;
    }

    // (27:6) {:else}
    function create_else_block_1(ctx) {
    	let div;
    	let span;
    	let t_value = /*board*/ ctx[27].name + "";
    	let t;
    	let div_data_key_value;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[23](/*board*/ ctx[27], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "tabName svelte-11cfegz");
    			set_style(span, "background-color", /*styles*/ ctx[1].unselectTabColor);
    			set_style(span, "color", /*styles*/ ctx[1].unselectTabTextColor);
    			add_location(span, file$6, 32, 12, 1227);
    			attr_dev(div, "class", "tab svelte-11cfegz");
    			set_style(div, "background-color", /*styles*/ ctx[1].unselectTabColor);
    			set_style(div, "color", /*styles*/ ctx[1].unselectTabTextColor);
    			attr_dev(div, "data-key", div_data_key_value = /*index*/ ctx[29]);
    			add_location(div, file$6, 27, 8, 1003);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*boardInfo*/ 1 && t_value !== (t_value = /*board*/ ctx[27].name + "")) set_data_dev(t, t_value);

    			if (dirty & /*styles*/ 2) {
    				set_style(span, "background-color", /*styles*/ ctx[1].unselectTabColor);
    			}

    			if (dirty & /*styles*/ 2) {
    				set_style(span, "color", /*styles*/ ctx[1].unselectTabTextColor);
    			}

    			if (dirty & /*styles*/ 2) {
    				set_style(div, "background-color", /*styles*/ ctx[1].unselectTabColor);
    			}

    			if (dirty & /*styles*/ 2) {
    				set_style(div, "color", /*styles*/ ctx[1].unselectTabTextColor);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(27:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (7:6) {#if currentBoard === board.id}
    function create_if_block$5(ctx) {
    	let div;
    	let span;
    	let div_data_key_value;
    	let mounted;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (/*editNameFlag*/ ctx[5]) return create_if_block_1$2;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	function dblclick_handler(...args) {
    		return /*dblclick_handler*/ ctx[22](/*board*/ ctx[27], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			if_block.c();
    			set_style(span, "background-color", /*styles*/ ctx[1].selectTabColor);
    			set_style(span, "color", /*styles*/ ctx[1].selectTabTextColor);
    			attr_dev(span, "class", "tabName svelte-11cfegz");
    			add_location(span, file$6, 12, 10, 399);
    			attr_dev(div, "class", "tab svelte-11cfegz");
    			set_style(div, "background-color", /*styles*/ ctx[1].selectTabColor);
    			set_style(div, "color", /*styles*/ ctx[1].selectTabTextColor);
    			attr_dev(div, "data-key", div_data_key_value = /*index*/ ctx[29]);
    			add_location(div, file$6, 7, 8, 178);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			if_block.m(span, null);

    			if (!mounted) {
    				dispose = listen_dev(div, "dblclick", dblclick_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}

    			if (dirty & /*styles*/ 2) {
    				set_style(span, "background-color", /*styles*/ ctx[1].selectTabColor);
    			}

    			if (dirty & /*styles*/ 2) {
    				set_style(span, "color", /*styles*/ ctx[1].selectTabTextColor);
    			}

    			if (dirty & /*styles*/ 2) {
    				set_style(div, "background-color", /*styles*/ ctx[1].selectTabColor);
    			}

    			if (dirty & /*styles*/ 2) {
    				set_style(div, "color", /*styles*/ ctx[1].selectTabTextColor);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(7:6) {#if currentBoard === board.id}",
    		ctx
    	});

    	return block;
    }

    // (22:16) {:else}
    function create_else_block$2(ctx) {
    	let t_value = /*board*/ ctx[27].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*boardInfo*/ 1 && t_value !== (t_value = /*board*/ ctx[27].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(22:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (15:16) {#if editNameFlag}
    function create_if_block_1$2(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	function input_input_handler() {
    		/*input_input_handler*/ ctx[18].call(input, /*each_value*/ ctx[28], /*index*/ ctx[29]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "svelte-11cfegz");
    			add_location(input, file$6, 15, 18, 577);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*board*/ ctx[27].name);
    			/*input_binding*/ ctx[19](input);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", input_input_handler),
    					listen_dev(input, "keydown", /*keydown_handler*/ ctx[20], false, false, false),
    					listen_dev(input, "blur", /*blur_handler*/ ctx[21], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*boardInfo*/ 1 && input.value !== /*board*/ ctx[27].name) {
    				set_input_value(input, /*board*/ ctx[27].name);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[19](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(15:16) {#if editNameFlag}",
    		ctx
    	});

    	return block;
    }

    // (6:4) {#each boardInfo as board, index }
    function create_each_block$4(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*currentBoard*/ ctx[4] === /*board*/ ctx[27].id) return create_if_block$5;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(6:4) {#each boardInfo as board, index }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let t1;
    	let div2;
    	let t2;
    	let div1;
    	let span;
    	let t3;
    	let div1_data_key_value;
    	let t4;
    	let listcontainer;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*boardInfo*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	listcontainer = new ListContainer({
    			props: {
    				lists: /*boardInfo*/ ctx[0].find(/*func*/ ctx[25]),
    				styles: /*styles*/ ctx[1],
    				user: /*user*/ ctx[3]
    			},
    			$$inline: true
    		});

    	listcontainer.$on("addlist", /*addList*/ ctx[10]);
    	listcontainer.$on("deleteList", /*deleteList*/ ctx[11]);
    	listcontainer.$on("additem", /*addItem*/ ctx[12]);
    	listcontainer.$on("deleteItem", /*deleteItem*/ ctx[13]);
    	listcontainer.$on("newItemMsg", /*newItemMsg*/ ctx[14]);
    	listcontainer.$on("newItemApp", /*newItemApp*/ ctx[15]);
    	listcontainer.$on("appUpdate", /*appUpdate*/ ctx[16]);
    	listcontainer.$on("listUpdate", /*listUpdate*/ ctx[17]);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = text(/*update*/ ctx[2]);
    			t1 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div1 = element("div");
    			span = element("span");
    			t3 = text("+");
    			t4 = space();
    			create_component(listcontainer.$$.fragment);
    			set_style(div0, "display", "none");
    			add_location(div0, file$6, 1, 2, 24);
    			attr_dev(span, "class", "tabName svelte-11cfegz");
    			set_style(span, "background-color", /*styles*/ ctx[1].unselectTabColor);
    			set_style(span, "color", /*styles*/ ctx[1].unselectTabTextColor);
    			set_style(span, "font-size", "30px");
    			set_style(span, "line-height", "20px");
    			add_location(span, file$6, 45, 6, 1655);
    			attr_dev(div1, "class", "tab svelte-11cfegz");
    			set_style(div1, "background-color", /*styles*/ ctx[1].unselectTabColor);
    			set_style(div1, "color", /*styles*/ ctx[1].unselectTabTextColor);
    			attr_dev(div1, "data-key", div1_data_key_value = -1);
    			add_location(div1, file$6, 40, 4, 1463);
    			attr_dev(div2, "id", "tabs");
    			attr_dev(div2, "class", "svelte-11cfegz");
    			add_location(div2, file$6, 4, 2, 77);
    			attr_dev(div3, "id", "MainBoard");
    			attr_dev(div3, "class", "svelte-11cfegz");
    			add_location(div3, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, t0);
    			append_dev(div3, t1);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, span);
    			append_dev(span, t3);
    			append_dev(div3, t4);
    			mount_component(listcontainer, div3, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", /*click_handler_1*/ ctx[24], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*update*/ 4) set_data_dev(t0, /*update*/ ctx[2]);

    			if (dirty & /*styles, editName, boardInfo, editField, editNameFlag, currentBoard, setBoard*/ 755) {
    				each_value = /*boardInfo*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, t2);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (!current || dirty & /*styles*/ 2) {
    				set_style(span, "background-color", /*styles*/ ctx[1].unselectTabColor);
    			}

    			if (!current || dirty & /*styles*/ 2) {
    				set_style(span, "color", /*styles*/ ctx[1].unselectTabTextColor);
    			}

    			if (!current || dirty & /*styles*/ 2) {
    				set_style(div1, "background-color", /*styles*/ ctx[1].unselectTabColor);
    			}

    			if (!current || dirty & /*styles*/ 2) {
    				set_style(div1, "color", /*styles*/ ctx[1].unselectTabTextColor);
    			}

    			const listcontainer_changes = {};
    			if (dirty & /*boardInfo, currentBoard*/ 17) listcontainer_changes.lists = /*boardInfo*/ ctx[0].find(/*func*/ ctx[25]);
    			if (dirty & /*styles*/ 2) listcontainer_changes.styles = /*styles*/ ctx[1];
    			if (dirty & /*user*/ 8) listcontainer_changes.user = /*user*/ ctx[3];
    			listcontainer.$set(listcontainer_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(listcontainer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(listcontainer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			destroy_component(listcontainer);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getCurrentLists() {
    	return;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { boardInfo } = $$props;
    	let { styles } = $$props;
    	let { update } = $$props;
    	let { user } = $$props;
    	let currentBoard = 0;
    	let editNameFlag = false;
    	let editField;
    	const dispatch = createEventDispatcher();

    	function setBoard(ind) {
    		$$invalidate(4, currentBoard = ind);
    	}

    	function addBoard() {
    		dispatch("addboard", {});
    	}

    	async function editName(num) {
    		$$invalidate(5, editNameFlag = true);
    		await tick();
    		editField.focus();
    	}

    	function addList(e) {
    		dispatch("addlist", { board: currentBoard });
    	}

    	function deleteList(e) {
    		dispatch("deleteList", { board: currentBoard, list: e.detail.list });
    	}

    	function addItem(e) {
    		dispatch("additem", { list: e.detail.list, board: currentBoard });
    	}

    	function deleteItem(e) {
    		dispatch("deleteItem", {
    			item: e.detail.item,
    			list: e.detail.list,
    			board: currentBoard
    		});
    	}

    	function newItemMsg(e) {
    		dispatch("newItemMsg", {
    			item: e.detail.item,
    			list: e.detail.list,
    			board: currentBoard,
    			msg: e.detail.msg
    		});
    	}

    	function newItemApp(e) {
    		dispatch("newItemApp", {
    			item: e.detail.item,
    			list: e.detail.list,
    			board: currentBoard,
    			app: e.detail.app
    		});
    	}

    	function appUpdate(e) {
    		dispatch("appUpdate", {
    			item: e.detail.item,
    			list: e.detail.list,
    			board: currentBoard,
    			app: e.detail.app
    		});
    	}

    	function listUpdate(e) {
    		dispatch("listUpdate", { list: e.detail.list, board: currentBoard });
    	}

    	const writable_props = ["boardInfo", "styles", "update", "user"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Board> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Board", $$slots, []);

    	function input_input_handler(each_value, index) {
    		each_value[index].name = this.value;
    		$$invalidate(0, boardInfo);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			editField = $$value;
    			$$invalidate(6, editField);
    		});
    	}

    	const keydown_handler = e => {
    		if (e.code === "Enter") $$invalidate(5, editNameFlag = false);
    	};

    	const blur_handler = () => {
    		$$invalidate(5, editNameFlag = false);
    	};

    	const dblclick_handler = (board, e) => {
    		editName(board.id);
    	};

    	const click_handler = board => {
    		setBoard(board.id);
    	};

    	const click_handler_1 = e => {
    		addBoard();
    	};

    	const func = board => currentBoard === board.id;

    	$$self.$set = $$props => {
    		if ("boardInfo" in $$props) $$invalidate(0, boardInfo = $$props.boardInfo);
    		if ("styles" in $$props) $$invalidate(1, styles = $$props.styles);
    		if ("update" in $$props) $$invalidate(2, update = $$props.update);
    		if ("user" in $$props) $$invalidate(3, user = $$props.user);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		tick,
    		ListContainer,
    		boardInfo,
    		styles,
    		update,
    		user,
    		currentBoard,
    		editNameFlag,
    		editField,
    		dispatch,
    		getCurrentLists,
    		setBoard,
    		addBoard,
    		editName,
    		addList,
    		deleteList,
    		addItem,
    		deleteItem,
    		newItemMsg,
    		newItemApp,
    		appUpdate,
    		listUpdate
    	});

    	$$self.$inject_state = $$props => {
    		if ("boardInfo" in $$props) $$invalidate(0, boardInfo = $$props.boardInfo);
    		if ("styles" in $$props) $$invalidate(1, styles = $$props.styles);
    		if ("update" in $$props) $$invalidate(2, update = $$props.update);
    		if ("user" in $$props) $$invalidate(3, user = $$props.user);
    		if ("currentBoard" in $$props) $$invalidate(4, currentBoard = $$props.currentBoard);
    		if ("editNameFlag" in $$props) $$invalidate(5, editNameFlag = $$props.editNameFlag);
    		if ("editField" in $$props) $$invalidate(6, editField = $$props.editField);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		boardInfo,
    		styles,
    		update,
    		user,
    		currentBoard,
    		editNameFlag,
    		editField,
    		setBoard,
    		addBoard,
    		editName,
    		addList,
    		deleteList,
    		addItem,
    		deleteItem,
    		newItemMsg,
    		newItemApp,
    		appUpdate,
    		listUpdate,
    		input_input_handler,
    		input_binding,
    		keydown_handler,
    		blur_handler,
    		dblclick_handler,
    		click_handler,
    		click_handler_1,
    		func
    	];
    }

    class Board extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			boardInfo: 0,
    			styles: 1,
    			update: 2,
    			user: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Board",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*boardInfo*/ ctx[0] === undefined && !("boardInfo" in props)) {
    			console.warn("<Board> was created without expected prop 'boardInfo'");
    		}

    		if (/*styles*/ ctx[1] === undefined && !("styles" in props)) {
    			console.warn("<Board> was created without expected prop 'styles'");
    		}

    		if (/*update*/ ctx[2] === undefined && !("update" in props)) {
    			console.warn("<Board> was created without expected prop 'update'");
    		}

    		if (/*user*/ ctx[3] === undefined && !("user" in props)) {
    			console.warn("<Board> was created without expected prop 'user'");
    		}
    	}

    	get boardInfo() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set boardInfo(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styles() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styles(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get update() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set update(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get user() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set user(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Login.svelte generated by Svelte v3.23.2 */
    const file$7 = "src/components/Login.svelte";

    // (21:2) {#if error !== null}
    function create_if_block$6(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*error*/ ctx[3]);
    			set_style(p, "color", "red");
    			add_location(p, file$7, 21, 4, 834);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*error*/ 8) set_data_dev(t, /*error*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(21:2) {#if error !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div3;
    	let h2;
    	let t1;
    	let div0;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let div1;
    	let label1;
    	let t6;
    	let input1;
    	let t7;
    	let div2;
    	let button;
    	let t9;
    	let mounted;
    	let dispose;
    	let if_block = /*error*/ ctx[3] !== null && create_if_block$6(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Login";
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Name:";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Password:";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "Submit";
    			t9 = space();
    			if (if_block) if_block.c();
    			attr_dev(h2, "class", "svelte-gi2eer");
    			add_location(h2, file$7, 3, 2, 182);
    			attr_dev(label0, "for", "name");
    			attr_dev(label0, "class", "svelte-gi2eer");
    			add_location(label0, file$7, 5, 4, 227);
    			attr_dev(input0, "id", "name");
    			attr_dev(input0, "name", "name");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "minlength", "4");
    			add_location(input0, file$7, 6, 4, 263);
    			attr_dev(div0, "class", "loginItem svelte-gi2eer");
    			add_location(div0, file$7, 4, 2, 199);
    			attr_dev(label1, "for", "passwd");
    			attr_dev(label1, "class", "svelte-gi2eer");
    			add_location(label1, file$7, 9, 4, 410);
    			attr_dev(input1, "id", "passwd");
    			attr_dev(input1, "name", "passwd");
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "minlength", "8");
    			add_location(input1, file$7, 10, 4, 452);
    			attr_dev(div1, "class", "loginItem svelte-gi2eer");
    			add_location(div1, file$7, 8, 2, 382);
    			add_location(button, file$7, 18, 4, 757);
    			attr_dev(div2, "class", "loginItem svelte-gi2eer");
    			set_style(div2, "margin", "auto");
    			add_location(div2, file$7, 17, 2, 707);
    			attr_dev(div3, "id", "login");
    			set_style(div3, "background-color", /*styles*/ ctx[0].backgroundcolor);
    			set_style(div3, "color", /*styles*/ ctx[0].textcolor);
    			set_style(div3, "border-color", /*styles*/ ctx[0].bordercolor);
    			attr_dev(div3, "class", "svelte-gi2eer");
    			add_location(div3, file$7, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, h2);
    			append_dev(div3, t1);
    			append_dev(div3, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t3);
    			append_dev(div0, input0);
    			/*input0_binding*/ ctx[5](input0);
    			append_dev(div3, t4);
    			append_dev(div3, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t6);
    			append_dev(div1, input1);
    			/*input1_binding*/ ctx[7](input1);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div2, button);
    			append_dev(div3, t9);
    			if (if_block) if_block.m(div3, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "focus", /*focus_handler*/ ctx[6], false, false, false),
    					listen_dev(input1, "keydown", /*keydown_handler*/ ctx[8], false, false, false),
    					listen_dev(input1, "focus", /*focus_handler_1*/ ctx[9], false, false, false),
    					listen_dev(button, "click", /*login*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*error*/ ctx[3] !== null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$6(ctx);
    					if_block.c();
    					if_block.m(div3, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*styles*/ 1) {
    				set_style(div3, "background-color", /*styles*/ ctx[0].backgroundcolor);
    			}

    			if (dirty & /*styles*/ 1) {
    				set_style(div3, "color", /*styles*/ ctx[0].textcolor);
    			}

    			if (dirty & /*styles*/ 1) {
    				set_style(div3, "border-color", /*styles*/ ctx[0].bordercolor);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			/*input0_binding*/ ctx[5](null);
    			/*input1_binding*/ ctx[7](null);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { styles } = $$props;
    	let name;
    	let passwd;
    	let error = null;

    	function login() {

    		{
    			//
    			// Tell the user the information is incorrect.
    			//
    			$$invalidate(3, error = "Sorry, these login details are incorrect.");
    		}
    	}

    	const writable_props = ["styles"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Login", $$slots, []);

    	function input0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			name = $$value;
    			$$invalidate(1, name);
    		});
    	}

    	const focus_handler = e => {
    		$$invalidate(3, error = "");
    	};

    	function input1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			passwd = $$value;
    			$$invalidate(2, passwd);
    		});
    	}

    	const keydown_handler = event => {
    		if (event.code === "Enter") login();
    	};

    	const focus_handler_1 = e => {
    		$$invalidate(3, error = "");
    	};

    	$$self.$set = $$props => {
    		if ("styles" in $$props) $$invalidate(0, styles = $$props.styles);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		styles,
    		name,
    		passwd,
    		error,
    		login
    	});

    	$$self.$inject_state = $$props => {
    		if ("styles" in $$props) $$invalidate(0, styles = $$props.styles);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("passwd" in $$props) $$invalidate(2, passwd = $$props.passwd);
    		if ("error" in $$props) $$invalidate(3, error = $$props.error);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		styles,
    		name,
    		passwd,
    		error,
    		login,
    		input0_binding,
    		focus_handler,
    		input1_binding,
    		keydown_handler,
    		focus_handler_1
    	];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { styles: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*styles*/ ctx[0] === undefined && !("styles" in props)) {
    			console.warn("<Login> was created without expected prop 'styles'");
    		}
    	}

    	get styles() {
    		throw new Error("<Login>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styles(value) {
    		throw new Error("<Login>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/UserList.svelte generated by Svelte v3.23.2 */

    const file$8 = "src/components/UserList.svelte";

    function create_fragment$8(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			add_location(div, file$8, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { kanbanInfo } = $$props;
    	let { styles } = $$props;
    	const writable_props = ["kanbanInfo", "styles"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<UserList> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("UserList", $$slots, []);

    	$$self.$set = $$props => {
    		if ("kanbanInfo" in $$props) $$invalidate(0, kanbanInfo = $$props.kanbanInfo);
    		if ("styles" in $$props) $$invalidate(1, styles = $$props.styles);
    	};

    	$$self.$capture_state = () => ({ kanbanInfo, styles });

    	$$self.$inject_state = $$props => {
    		if ("kanbanInfo" in $$props) $$invalidate(0, kanbanInfo = $$props.kanbanInfo);
    		if ("styles" in $$props) $$invalidate(1, styles = $$props.styles);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [kanbanInfo, styles];
    }

    class UserList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { kanbanInfo: 0, styles: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "UserList",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*kanbanInfo*/ ctx[0] === undefined && !("kanbanInfo" in props)) {
    			console.warn("<UserList> was created without expected prop 'kanbanInfo'");
    		}

    		if (/*styles*/ ctx[1] === undefined && !("styles" in props)) {
    			console.warn("<UserList> was created without expected prop 'styles'");
    		}
    	}

    	get kanbanInfo() {
    		throw new Error("<UserList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set kanbanInfo(value) {
    		throw new Error("<UserList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styles() {
    		throw new Error("<UserList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styles(value) {
    		throw new Error("<UserList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/SvelteKanban.svelte generated by Svelte v3.23.2 */
    const file$9 = "src/SvelteKanban.svelte";

    // (28:2) {:else}
    function create_else_block_1$1(ctx) {
    	let h1;
    	let t1;
    	let login_1;
    	let current;

    	login_1 = new Login({
    			props: { styles: /*defaultStyles*/ ctx[5] },
    			$$inline: true
    		});

    	login_1.$on("loginAccepted", /*acceptLogin*/ ctx[7]);

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Person Kanban Board from ScriptPad";
    			t1 = space();
    			create_component(login_1.$$.fragment);
    			add_location(h1, file$9, 28, 4, 972);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(login_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(login_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(login_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			destroy_component(login_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(28:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (4:2) {#if login}
    function create_if_block$7(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let h2;
    	let t2_value = /*currentUserData*/ ctx[3].name + "";
    	let t2;
    	let t3;
    	let t4;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$3, create_else_block$3];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*showUserList*/ ctx[6]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "ScriptPad Kanban Board";
    			t1 = space();
    			h2 = element("h2");
    			t2 = text(t2_value);
    			t3 = text(", welcome back!");
    			t4 = space();
    			if_block.c();
    			if_block_anchor = empty();
    			attr_dev(h1, "class", "svelte-1lsfu3h");
    			add_location(h1, file$9, 5, 6, 210);
    			attr_dev(h2, "class", "svelte-1lsfu3h");
    			add_location(h2, file$9, 6, 6, 248);
    			attr_dev(div, "id", "Header");
    			attr_dev(div, "class", "svelte-1lsfu3h");
    			add_location(div, file$9, 4, 4, 186);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, h2);
    			append_dev(h2, t2);
    			append_dev(h2, t3);
    			insert_dev(target, t4, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*currentUserData*/ 8) && t2_value !== (t2_value = /*currentUserData*/ ctx[3].name + "")) set_data_dev(t2, t2_value);
    			if_block.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t4);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(4:2) {#if login}",
    		ctx
    	});

    	return block;
    }

    // (12:4) {:else}
    function create_else_block$3(ctx) {
    	let board;
    	let current;

    	board = new Board({
    			props: {
    				boardInfo: /*Kanban*/ ctx[0].boards,
    				styles: /*styles*/ ctx[1],
    				update: /*updateCount*/ ctx[4],
    				user: /*currentUserData*/ ctx[3]
    			},
    			$$inline: true
    		});

    	board.$on("addboard", /*addboard_handler*/ ctx[17]);
    	board.$on("addlist", /*addlist_handler*/ ctx[18]);
    	board.$on("additem", /*additem_handler*/ ctx[19]);
    	board.$on("deleteList", /*deleteList_handler*/ ctx[20]);
    	board.$on("deleteItem", /*deleteItem*/ ctx[12]);
    	board.$on("newItemMsg", /*newItemMsg*/ ctx[13]);
    	board.$on("newItemApp", /*newItemApp*/ ctx[14]);
    	board.$on("appUpdate", /*appUpdate*/ ctx[15]);
    	board.$on("listUpdate", /*listUpdate*/ ctx[16]);

    	const block = {
    		c: function create() {
    			create_component(board.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(board, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const board_changes = {};
    			if (dirty & /*Kanban*/ 1) board_changes.boardInfo = /*Kanban*/ ctx[0].boards;
    			if (dirty & /*styles*/ 2) board_changes.styles = /*styles*/ ctx[1];
    			if (dirty & /*updateCount*/ 16) board_changes.update = /*updateCount*/ ctx[4];
    			if (dirty & /*currentUserData*/ 8) board_changes.user = /*currentUserData*/ ctx[3];
    			board.$set(board_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(board.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(board.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(board, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(12:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (9:4) {#if showUserList}
    function create_if_block_1$3(ctx) {
    	let userlist;
    	let current;

    	userlist = new UserList({
    			props: { styles: /*defaultStyles*/ ctx[5] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(userlist.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(userlist, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(userlist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(userlist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(userlist, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(9:4) {#if showUserList}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$7, create_else_block_1$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*login*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "id", "main");
    			set_style(div, "background-color", /*styles*/ ctx[1].backgroundcolor);
    			set_style(div, "color", /*styles*/ ctx[1].textcolor);
    			set_style(div, "font-family", /*styles*/ ctx[1].font);
    			attr_dev(div, "class", "svelte-1lsfu3h");
    			add_location(div, file$9, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}

    			if (!current || dirty & /*styles*/ 2) {
    				set_style(div, "background-color", /*styles*/ ctx[1].backgroundcolor);
    			}

    			if (!current || dirty & /*styles*/ 2) {
    				set_style(div, "color", /*styles*/ ctx[1].textcolor);
    			}

    			if (!current || dirty & /*styles*/ 2) {
    				set_style(div, "font-family", /*styles*/ ctx[1].font);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let Kanban = {
    		user: {},
    		boards: [{ name: "New Board", lists: [] }]
    	};

    	let defaultStyles = {
    		backgroundcolor: "skyblue",
    		textcolor: "darkslateblue",
    		bordercolor: "darkslateblue",
    		unselectTabColor: "blue",
    		unselectTabTextColor: "white",
    		selectTabColor: "white",
    		selectTabTextColor: "black"
    	};

    	let styles = defaultStyles;
    	let login = true;

    	let currentUserData = {
    		ID: 0,
    		name: "Richard Guay",
    		login: "raguay@customct.com",
    		passwd: "ragjesus",
    		status: "admin"
    	};

    	let showUserList = false;
    	let updateCount = 0;

    	onMount(() => {
    		//
    		// This should be loaded from the server when a user is logged in.
    		//
    		$$invalidate(0, Kanban = {
    			boards: [
    				{
    					id: 0,
    					name: "Job One",
    					lists: [
    						{
    							id: 1000,
    							name: "Inbox",
    							items: [
    								{
    									id: 1001,
    									name: "Test",
    									description: "This is a test item.",
    									color: ["blue"],
    									notes: [
    										{
    											date: "01/01/2020",
    											owner: "Richard Guay",
    											type: "text",
    											info: "This is a test message."
    										}
    									],
    									apps: []
    								}
    							]
    						},
    						{
    							id: 2000,
    							name: "Working",
    							items: [
    								{
    									id: 2001,
    									name: "Test",
    									description: "This is a test item.",
    									color: ["blue"],
    									notes: [],
    									apps: []
    								}
    							]
    						},
    						{
    							id: 3000,
    							name: "Done",
    							items: [
    								{
    									id: 3001,
    									name: "Test",
    									description: "This is a test item.",
    									color: ["blue"],
    									notes: [],
    									apps: []
    								}
    							]
    						}
    					]
    				},
    				{
    					id: 1,
    					name: "Job Two",
    					lists: [
    						{
    							id: 1000,
    							name: "Inbox",
    							items: [
    								{
    									id: 1001,
    									name: "Test",
    									description: "This is a test item.",
    									color: ["blue"],
    									notes: [],
    									apps: []
    								}
    							]
    						}
    					]
    				}
    			],
    			user: {
    				ID: 0,
    				name: "Richard Guay",
    				login: "raguay@customct.com",
    				passwd: "ragjesus",
    				status: "admin"
    			}
    		});

    		$$invalidate(1, styles = {
    			backgroundcolor: "blue",
    			textcolor: "white",
    			unselectTabColor: "lightgray",
    			unselectTabTextColor: "black",
    			selectTabColor: "lightblue",
    			selectTabTextColor: "black",
    			mainboardcolor: "lightblue",
    			listcontainercolor: "lightblue",
    			listbgcolor: "#9AC2FA",
    			listtextcolor: "white",
    			itembgcolor: "white",
    			itemtextcolor: "black",
    			font: "\"Fira Code\"",
    			dialogBGColor: "lightblue",
    			dialogTextColor: "black"
    		});
    	});

    	function acceptLogin(data) {
    		$$invalidate(3, currentUserData = data.detail.userdata);
    		$$invalidate(1, styles = data.detail.styles);
    		$$invalidate(2, login = true);
    	}

    	function addBoard() {
    		var newID = 0;

    		Kanban.boards.forEach(item => {
    			if (item.id > newID) newID = item.id;
    		});

    		Kanban.boards.push({
    			id: newID + 1,
    			name: "New Board",
    			lists: []
    		});

    		$$invalidate(0, Kanban);
    	}

    	function addList(e) {
    		var newID = 0;

    		Kanban.boards.map(board => {
    			if (e.detail.board === board.id) {
    				board.lists.forEach(item => {
    					if (item.id > newID) newID = item.id;
    				});
    			}
    		});

    		newID = (newID / 1000 + 1) * 1000;

    		$$invalidate(
    			0,
    			Kanban.boards = Kanban.boards.map(board => {
    				if (e.detail.board === board.id) {
    					board.lists.push({ id: newID, name: "New List", items: [] });
    				}

    				return board;
    			}),
    			Kanban
    		);

    		$$invalidate(0, Kanban);
    		$$invalidate(4, updateCount = updateCount + 1);
    	}

    	function addItem(e) {
    		var newID = 0;

    		Kanban.boards.map(board => {
    			if (e.detail.board === board.id) {
    				board.lists.map(list => {
    					if (e.detail.list === list.id) {
    						list.items.forEach(item => {
    							if (item.id > newID) newID = item.id;
    						});
    					}
    				});
    			}
    		});

    		$$invalidate(
    			0,
    			Kanban.boards = Kanban.boards.map(board => {
    				if (e.detail.board === board.id) {
    					board.lists = board.lists.map(list => {
    						if (e.detail.list == list.id) {
    							list.items.push({
    								id: newID + 1,
    								name: "New Item",
    								description: "",
    								color: [],
    								notes: [],
    								apps: []
    							});
    						}

    						return list;
    					});
    				}

    				return board;
    			}),
    			Kanban
    		);

    		window.Kanban = Kanban;
    		$$invalidate(4, updateCount = updateCount + 1);
    	}

    	function deleteList(e) {
    		Kanban.boards.map(board => {
    			if (e.detail.board === board.id) {
    				board.lists = board.lists.filter(list => e.detail.list !== list.id);
    			}
    		});

    		$$invalidate(0, Kanban);
    		$$invalidate(4, updateCount = updateCount + 1);
    	}

    	function deleteItem(e) {
    		Kanban.boards.map(board => {
    			if (e.detail.board === board.id) {
    				board.lists.map(list => {
    					if (e.detail.list === list.id) {
    						list.items = list.items.filter(item => e.detail.item !== item.id);
    					}
    				});
    			}
    		});

    		$$invalidate(0, Kanban);
    		$$invalidate(4, updateCount = updateCount + 1);
    	}

    	function newItemMsg(e) {
    		Kanban.boards.map(board => {
    			if (e.detail.board === board.id) {
    				board.lists.map(list => {
    					if (e.detail.list === list.id) {
    						list.items.map(item => {
    							if (item.id === e.detail.item) {
    								var nwnotes = [];
    								nwnotes.push(e.detail.msg);
    								item.notes.forEach(note => nwnotes.push(note));
    								item.notes = nwnotes;
    							}
    						});
    					}
    				});
    			}
    		});

    		$$invalidate(0, Kanban);
    		$$invalidate(4, updateCount = updateCount + 1);
    	}

    	function newItemApp(e) {
    		Kanban.boards.map(board => {
    			if (e.detail.board === board.id) {
    				board.lists.map(list => {
    					if (e.detail.list === list.id) {
    						list.items.map(item => {
    							if (item.id === e.detail.item) {
    								item.apps.push(e.detail.app);
    							}
    						});
    					}
    				});
    			}
    		});

    		$$invalidate(0, Kanban);
    		$$invalidate(4, updateCount = updateCount + 1);
    	}

    	function appUpdate(e) {
    		Kanban.boards.map(board => {
    			if (e.detail.board === board.id) {
    				board.lists.map(list => {
    					if (e.detail.list === list.id) {
    						list.items.map(item => {
    							if (item.id === e.detail.item) {
    								item.apps.map(app => {
    									if (app.id === e.detail.app.id) {
    										app = e.detail.app;
    									}
    								});
    							}
    						});
    					}
    				});
    			}
    		});

    		$$invalidate(0, Kanban);
    		$$invalidate(4, updateCount = updateCount + 1);
    	}

    	function listUpdate(e) {
    		Kanban.boards.map(board => {
    			if (e.detail.board === board.id) {
    				board.lists.map(list => {
    					if (e.detail.list.id == list.id) {
    						list = e.detail.list;
    					}
    				});
    			}
    		});

    		$$invalidate(0, Kanban);
    		$$invalidate(4, updateCount = updateCount + 1);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SvelteKanban> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("SvelteKanban", $$slots, []);

    	const addboard_handler = () => {
    		addBoard();
    	};

    	const addlist_handler = e => {
    		addList(e);
    	};

    	const additem_handler = e => {
    		addItem(e);
    	};

    	const deleteList_handler = e => {
    		deleteList(e);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		Board,
    		Login,
    		UserList,
    		Kanban,
    		defaultStyles,
    		styles,
    		login,
    		currentUserData,
    		showUserList,
    		updateCount,
    		acceptLogin,
    		addBoard,
    		addList,
    		addItem,
    		deleteList,
    		deleteItem,
    		newItemMsg,
    		newItemApp,
    		appUpdate,
    		listUpdate
    	});

    	$$self.$inject_state = $$props => {
    		if ("Kanban" in $$props) $$invalidate(0, Kanban = $$props.Kanban);
    		if ("defaultStyles" in $$props) $$invalidate(5, defaultStyles = $$props.defaultStyles);
    		if ("styles" in $$props) $$invalidate(1, styles = $$props.styles);
    		if ("login" in $$props) $$invalidate(2, login = $$props.login);
    		if ("currentUserData" in $$props) $$invalidate(3, currentUserData = $$props.currentUserData);
    		if ("showUserList" in $$props) $$invalidate(6, showUserList = $$props.showUserList);
    		if ("updateCount" in $$props) $$invalidate(4, updateCount = $$props.updateCount);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		Kanban,
    		styles,
    		login,
    		currentUserData,
    		updateCount,
    		defaultStyles,
    		showUserList,
    		acceptLogin,
    		addBoard,
    		addList,
    		addItem,
    		deleteList,
    		deleteItem,
    		newItemMsg,
    		newItemApp,
    		appUpdate,
    		listUpdate,
    		addboard_handler,
    		addlist_handler,
    		additem_handler,
    		deleteList_handler
    	];
    }

    class SvelteKanban extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SvelteKanban",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    const app = new SvelteKanban({
      target: document.body,
      props: {
      }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
