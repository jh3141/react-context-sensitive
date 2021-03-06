import React from 'react';
import ReactDOM from 'react-dom';
import ContextSensitiveStub from "./ContextSensitiveStub";
import { resultForId, evaluateCondition } from "./SenseResultUtils";

export default class ContextSensitiveFactory extends ContextSensitiveStub
{
    renderWithSenseResults (senseResults)
    {
        if (senseResults.length == 0 || senseResults[0].sensorNotExecuted)
        {
            // we don't have any results yet. render a placeholder if one was specified
            if (this.props.pendingPlaceholder) return this.props.pendingPlaceholder;
            // otherwise return our own default placeholder
            return <span ref={this.setElement} />
        }

        for (let factory of this.props.factories)
        {
            if (!evaluateCondition (factory.when, senseResults)) continue;

            if (factory.use) return this.prepareRootElement (factory.use);
        }

        if (this.props.logMatchFailures)
            console.log("No matching factories for sense results: " + JSON.stringify(
                senseResults.map(item => ({ id: item.id, distance: item.descriptor && item.descriptor.distance }))));

        return this.prepareRootElement (this.props.defaultValue);
    }
    prepareRootElement (element)
    {
        return React.cloneElement(element, { ref: this.setElement });
    }
}
