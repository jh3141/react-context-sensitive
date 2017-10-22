import React from 'react';
import ReactDOM from 'react-dom';

export default class ContextSensitiveStub extends React.Component
{
    constructor (props)
    {
        super(props);

        this.setElement = this.setElement.bind(this);
        this.domTreeMutated = this.domTreeMutated.bind(this);

        this.latestSenseResults = this.emptySenseResults ();
        this.state = this.calculateState ();
        this.sensorsExecuted = false;
    }
    calculateState ()
    {
        return this.expandResults({
            senseResults: this.latestSenseResults
        });
    }
    expandResults (state)
    {
        for (let result of state.senseResults) {
            state[result.id] = result.descriptor;
        }

        return state;
    }
    componentDidMount ()
    {
        if (!this.element) {
            console.warn ("componentDidMount called but element not set; missing ref attribute in render?")
            return;
        }
        this.latestSenseResults = this.executeAllSenseOperations ();
        this.updateState ();
        this.addObservers ();
    }
    componentWillUnmount ()
    {
        this.latestSenseResults = this.emptySenseResults ();
        this.updateState ();
    }
    safeDepthByLimits ()
    {
        let observerDepth = 1;
        for (let sensor of this.props.sensors)
            if (sensor.maxUp) {
                if (sensor.maxUp > observerDepth) observerDepth = sensor.maxUp + 1;
            }
            else {  // FIXME can use container specifications for sensors that don't have a max depth
                return undefined;
            }
        return observerDepth;
    }
    addObservers ()
    {
        let observerDepth = this.safeDepthByLimits ();
        if (!observerDepth) {
            console.log ("Not all sensors have upwards search limitations; observation disabled");
            return;
        }

        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        let node = this.element;
        for (let i = 0; i <= observerDepth; i ++)
            node = node && node.parentNode;

        if (!node) {
            console.log ("Observer depth exceed document depth; observation disabled");
            return;
        }

        this.observer = new MutationObserver (this.domTreeMutated);
        this.observer.observe (node, { childList: true, subtree: true });
    }
    domTreeMutated ()
    {
        console.log ("Detected DOM mutations within range; rerunning sensors");
        this.latestSenseResults = this.executeAllSenseOperations ();
        this.updateState ();
    }
    sensorStateChanged ()
    {
        this.setState (this.calculateState ());
    }
    getLastState ()
    {
        return this.state;
    }
    updateState ()
    {
        let oldState = this.getLastState ();

        if (! this.sensorsExecuted) {
            this.sensorStateChanged ();
            this.sensorsExecuted = true;
            return;
        }

        for (let result of this.latestSenseResults)
        {
            if (result.descriptor && oldState[result.id])
            {
                if (result.element !== oldState[result.id].element ||
                    result.distance.inLevel != oldState[result.id].distance.inLevel ||
                    result.distance.up != oldState[result.id].distance.up)
                {
                    this.sensorStateChanged ();
                    return;
                }
            }
            else if (result.descriptor || oldState[result.id])
            {
                this.sensorStateChanged ();
                return;
            }
        }
    }
    emptySenseResults ()
    {
        return this.props.sensors.map(sensor => ({
            id: sensor.id,
            descriptor: null,
            sensorNotExecuted: true
        }));
    }
    setElement (element) { this.element = element; }
    render ()
    {
        return this.renderWithSenseResults (this.latestSenseResults);
    }

    renderWithSenseResults (senseResults)
    {
        return <div ref={this.setElement} />;
    }

    executeAllSenseOperations ()
    {
        return this.props.sensors.map (sensor => ({
            id: sensor.id,
            descriptor: this.executeSensor (sensor)
        }));
    }

    findContainer (node, containerSpec)
    {
        let container = containerSpec
                            ? (containerSpec instanceof Element
                                    ? containerSpec
                                    : node.parentNode.closest (containerSpec))
                            : node.ownerDocument.body;

        if (!container.contains(node)) // node is probably not attached to a document, so default doesn't apply
            container = { contains: n => true };
        return container;
    }

    executeSensor (sensor)
    {
        let node = this.element;
        if (!node||!node.parentNode) {
            return null;    // we'll re-reun later, so this isn't an important problem.
        }

        let container = this.findContainer (node, sensor.inContainer);
        if (sensor.startInAncestor) {
            node = node.parentNode.closest(sensor.startInAncestor);
            if (!node || !container.contains(node)) return null;
        }
        let distance = { inLevel: 0, up: 0 };
        if (sensor.debug) { console.log ("Starting sensor " + sensor.id + " at " + node.outerHTML); }
        while ((node = this.moveInDirection (sensor.direction, node, distance)) && container.contains(node))
        {
            if (sensor.debug) { console.log ("Sensor " + sensor.id + " " + JSON.stringify(distance) + " => " + node.outerHTML); }
            if (sensor.maxUp && distance.up > sensor.maxUp) {
                if (sensor.debug) { console.log ("Sensor " + sensor.id + " failed (maxUp violated)"); }
                return null;
            }

            let matches = node.matches(sensor.selector)
                                ? [ node ]
                                : node.querySelectorAll (sensor.selector);

            if (matches.length > 0)
            {
                if (sensor.debug) { console.log ("Sensor " + sensor.id + " found match"); }
                return {
                    element: this.elementAtClosestEnd(matches, sensor.direction),
                    distance: distance
                };
            }
            // every movement is *always* inlevel, so can optimize the searches by checking here rather than
            // after the next movement.
            if (sensor.maxInLevel && distance.inLevel >= sensor.maxInLevel) {
                if (sensor.debug) { console.log ("Sensor " + sensor.id + " failed (maxInLevel violated)"); }
                return null;
            }
        }
        if (sensor.debug) { console.log ("Sensor " + sensor.id + " failed (left container)"); }
        return null;
    }

    moveInDirection (direction, node, distanceCounter)
    {
        if (!node) return null;

        let result = this.moveInLevelInDirection (direction, node, distanceCounter);
        if (result) return result;

        distanceCounter.inLevel --;
        distanceCounter.up ++;
        return this.moveInDirection(direction, node.parentNode, distanceCounter);
    }

    moveInLevelInDirection (direction, node, distanceCounter)
    {
        distanceCounter.inLevel ++;
        switch (direction)
        {
            case "start":
                return node.previousElementSibling;
            case "end":
                return node.nextElementSibling;
        }
    }

    elementAtClosestEnd (elementList, direction)
    {
        if (! elementList || elementList.length == 0) return null;
        switch (direction)
        {
            case "start": return elementList[elementList.length - 1];
            case "end": return elementList[0];
        }
    }

    prepareRootElement (element)
    {
        return React.cloneElement (element, { ref: this.setElement });
    }
}
