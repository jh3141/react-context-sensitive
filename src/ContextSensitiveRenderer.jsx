import React from 'react';
import ReactDOM from 'react-dom';
import ContextSensitiveStub from "./ContextSensitiveStub.jsx";
import { resultForId, evaluateCondition } from "./SenseResultUtils";

export default class ContextSensitiveRenderer extends ContextSensitiveStub
{
    constructor (props)
    {
        super(props);
        this.runRenderingScripts = this.runRenderingScripts.bind(this);
        this.setCanvasRef = this.setCanvasRef.bind(this);
    }

    // we don't actually update the state when we detect a change in sensor results;
    // this prevents an unnecessary rerender step.  Instead, we hold the data that
    // would be in the state in a property:
    sensorStateChanged ()
    {
        this.sensorData = this.calculateState ();
        window.requestAnimationFrame(this.runRenderingScripts);
    }
    // and the updateState method needs to be able to find the data to check whether
    // anything changed...
    getLastState ()
    {
        return this.sensorData;
    }

    setCanvasRef (canvas)
    {
        this.canvas = canvas;
        // if the canvas has changed, we need to rerender.
        window.requestAnimationFrame(this.runRenderingScripts);
    }

    renderWithSenseResults (senseResults)
    {
        window.requestAnimationFrame(this.runRenderingScripts);
        return <canvas ref={this.storeCanvasRef} />
    }

    runRenderingScripts ()
    {
        let senseResults = this.latestSenseResults;
        let context = this.canvas.getContext(this.props.contextType || "2d");

        for (let script of this.props.scripts)
        {
            if (!evaluateCondition (script.when, senseResults)) continue;
            if (script.renderer) {
                console.log ("Run renderer: " + script.name);
                script.renderer (context, this.canvas, this);
            }
            if (script.isTerminal) return;
        }
    }
}
