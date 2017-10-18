import React from 'react';
import ReactDOM from 'react-dom';

export default class ContextSensitiveStub extends React.Component
{
    constructor (props)
    {
        super(props);

        this.latestSenseResults = this.emptySenseResults ();
        this.state = this.calculateState ();
    }
    calculateState ()
    {
        return this.expandResults({
            senseResults: this.latestSenseResults
        });
    }
    expandResults (state)
    {
        for (let result of state.senseResults)
            state[result.id] = result.descriptor;
        return state;
    }
    componentDidMount ()
    {
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
        let node = ReactDOM.findDOMNode(this);
        for (let i = 0; i <= observerDepth; i ++)
            node = node && node.parentNode;

        if (!node) {
            console.log ("Observer depth exceed document depth; observation disabled");
            return;
        }

        console.log ("Adding mutation observer");
        this.observer = new MutationObserver (mutationList => this.domTreeMutated(mutationList));
        this.observer.observe (node, { childList: true, subtree: true });
    }
    domTreeMutated ()
    {
        console.log ("Detected DOM mutations within range; rerunning sensors");
        this.latestSenseResults = this.executeAllSenseOperations ();
        this.updateState ();
    }
    updateState ()
    {
        for (let result of this.latestSenseResults)
        {
            if (result.descriptor && this.state[result.id])
            {
                if (result.element !== this.state[result.id].element ||
                    result.distance.inLevel != this.state[result.id].distance.inLevel ||
                    result.distance.up != this.state[result.id].distance.up)
                {
                    console.log ("Updating state");
                    this.setState (this.calculateState());
                    return;
                }
            }
            else if (result.descriptor || this.state[result.id])
            {
                console.log ("Updating state");
                this.setState (this.calculateState());
                return;
            }
        }
    }
    emptySenseResults ()
    {
        return this.props.sensors.map(sensor => ({
            id: sensor.id,
            descriptor: null
        }));
    }
    render ()
    {
        console.log ("Rendering with " + this.latestSenseResults.filter(z => z.descriptor).length + " successful searches");
        return this.renderWithSenseResults (this.latestSenseResults);
    }

    renderWithSenseResults (senseResults)
    {
        return <div/>;
    }

    executeAllSenseOperations ()
    {
        return this.props.sensors.map (sensor => ({
            id: sensor.id,
            descriptor: this.executeSensor (sensor)
        }));
    }

    executeSensor (sensor)
    {
        console.log ("Executing sensor: " + sensor.id);

        let node = ReactDOM.findDOMNode(this);
        if (!node) {
            console.log ("Component is not mounted!");
            return;
        }
        if (!node.parentNode) {
            console.log ("Component element is not parented!");
            return;
        }
        let container = sensor.inContainer ?
                            (sensor.inContainer instanceof Element ? sensor.inContainer :
                                                                     node.parentNode.closest (sensor.inContainer)) :
                            node.ownerDocument.body;

        if (!container.contains(node)) // node is probably not attached to a document, so default doesn't apply
            container = { contains: n => true };

        let distance = { inLevel: 0, up: 0 };
        console.log ("  Container = ", container);
        console.log ("  Initial node = ", node, "(container contains node: " + container.contains(node) + ")");
        while ((node = this.moveInDirection (sensor.direction, node, distance)) && container.contains(node))
        {
            if (sensor.maxUp && distance.up > sensor.maxUp) return null;

            console.log ("  Current node = ", node);
            let matches = node.matches(sensor.selector)
                                ? [ node ]
                                : node.querySelectorAll (sensor.selector);
            console.log ("  Match count = " , matches.length);
            if (matches.length > 0)
                return {
                    element: this.elementAtClosestEnd(matches, sensor.direction),
                    distance: distance
                };

            // every movement is *always* inlevel, so can optimize the searches by checking here rather than
            // after the next movement.
            if (sensor.maxInLevel && distance.inLevel >= sensor.maxInLevel) return null;
        }
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
}
