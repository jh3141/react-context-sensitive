import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';
import ContextSensitiveStub from '../src/ContextSensitiveStub.jsx';
import { resultForId } from '../src/SenseResultUtils.js';

var globalSenseResults = null;
var defaultSensors = [
    { id: "a", selector: ".Foo", direction: "start", maxInLevel: 1, maxUp: 2 },
    { id: "b", selector: ".Foo", direction: "end", maxInLevel: 3, maxUp: 1}
];
var startingPositionSensors = [
    { id: "a", selector: ".Foo", direction: "start", maxInLevel: 1, maxUp: 0, startInAncestor: ".StartHere" }
];

class ContextSensitiveStubSpy extends ContextSensitiveStub {
    renderWithSenseResults (senseResults) { globalSenseResults = senseResults; return <div ref={this.setElement} />; }
}
class ChangingMiddle extends React.Component
{
    constructor (props)
    {
        super(props);
        this.state = { middle: this.props.initialMiddle };
    }
    changeMiddle (newValue)
    {
        this.setState ({middle: newValue});
    }
    render ()
    {
        if (this.state.middle !== this.props.initialMiddle)
            console.log ("Rerendering with new middle");
        return this.addNestingLevels(<div>{this.props.atStart}{this.state.middle}{this.props.atEnd}</div>, 1);
    }
    addNestingLevels (nodes, levels)
    {
        if (levels >= this.props.nestDepth) return nodes;
        return this.addNestingLevels(<div>{nodes}</div>, levels + 1);
    }
}

function waitsForAndRuns (escapeFunction, runFunction, escapeTime, done) {
  // check the escapeFunction every millisecond so as soon as it is met we can escape the function
  var interval = setInterval(function() {
    if (escapeFunction()) {
      clearMe();
      runFunction();
    }
  }, 1);

  // in case we never reach the escapeFunction, we will time out
  // at the escapeTime
  var timeOut = setTimeout(function() {
    clearMe();
    runFunction();
  }, escapeTime);

  // clear the interval and the timeout
  function clearMe(){
    clearInterval(interval);
    clearTimeout(timeOut);
    if (done) done ();
  }
};

describe ("<ContextSensitiveStub/>", () => {
    it ("renders in empty document with no extra data",  () => {
        ReactTestUtils.renderIntoDocument (<ContextSensitiveStubSpy sensors={defaultSensors} />);
        expect(resultForId(globalSenseResults, "a")).toBeNull();
        expect(resultForId(globalSenseResults, "b")).toBeNull();
        expect(resultForId(globalSenseResults, "c")).toBeNull();
        expect(resultForId(globalSenseResults, "d")).toBeNull();
    });


    it ("identifies a matching node immediately before itself",  () => {
        ReactTestUtils.renderIntoDocument (<div>
            <div className="Foo" />
            <ContextSensitiveStubSpy sensors={defaultSensors} />
        </div>);
        expect(resultForId(globalSenseResults, "a")).toHaveMember("element");
        expect(resultForId(globalSenseResults, "a").element.className).toBe("Foo");
    });

    it ("identifies a matching node immediately after itself",  () => {
        ReactTestUtils.renderIntoDocument (<div>
            <ContextSensitiveStubSpy sensors={defaultSensors} />
            <div className="Foo" />
        </div>);
        expect(resultForId(globalSenseResults, "b")).toHaveMember("element");
        expect(resultForId(globalSenseResults, "b").element.className).toBe("Foo");
    });

    it ("finds nodes that involve stepping into levels", () => {
        ReactTestUtils.renderIntoDocument (<div>
            <ContextSensitiveStubSpy sensors={defaultSensors} />
            <div><div className="Foo" /></div>
        </div>);
        expect(resultForId(globalSenseResults, "b")).toHaveMember("element");
        expect(resultForId(globalSenseResults, "b").element.className).toBe("Foo");
    });

    it ("finds nodes that involve stepping out of levels", () => {
        ReactTestUtils.renderIntoDocument (<div>
            <div><ContextSensitiveStubSpy sensors={defaultSensors} /></div>
            <div className="Foo" />
        </div>);
        expect(resultForId(globalSenseResults, "b")).toHaveMember("element");
        expect(resultForId(globalSenseResults, "b").element.className).toBe("Foo");
    });

    it ("counts distance", () => {
        ReactTestUtils.renderIntoDocument (<div>
            <div><ContextSensitiveStubSpy sensors={defaultSensors} /></div>
            <div></div><div></div>
            <div className="Foo" />
        </div>);

        expect(resultForId(globalSenseResults, "b")).toHaveMember("distance");
        expect(resultForId(globalSenseResults, "b").distance.inLevel).toBe(3);
        expect(resultForId(globalSenseResults, "b").distance.up).toBe(1);
    });

    it ("limits search distance inlevel (for parameter 1)", () => {
        ReactTestUtils.renderIntoDocument (<div>
            <div className="Foo" />
            <div></div>
            <ContextSensitiveStubSpy sensors={defaultSensors} />
        </div>);
        expect(resultForId(globalSenseResults, "a")).toBeNull();
    });

    it ("limits search distance inlevel (for parameter 3)", () => {
        ReactTestUtils.renderIntoDocument (<div>
            <ContextSensitiveStubSpy sensors={defaultSensors} />
            <div></div><div></div><div></div>
            <div className="Foo" />
        </div>);
        expect(resultForId(globalSenseResults, "b")).toBeNull();
    });
    it ("limits search distance up-level (for parameter 1)", () => {
        ReactTestUtils.renderIntoDocument (<div>
            <div><div><ContextSensitiveStubSpy sensors={defaultSensors} /></div></div>
            <div className="Foo" />
        </div>);
        expect(resultForId(globalSenseResults, "b")).toBeNull();
    });
    it ("detects changes to the dom and reruns sense operations", (done) => {
        let container = null
        let div = document.createElement("div");
        document.body.appendChild(div);
        ReactDOM.render(
                <ChangingMiddle ref={c => container = c} nestDepth={5}
                            atStart={<ContextSensitiveStubSpy key="s" sensors={defaultSensors} />}
                            middle={[]}
                            atEnd={<div key="e" />} />,
                div);

        expect(resultForId(globalSenseResults, "b")).toBeNull();
        container.changeMiddle([<div key="1" className="Foo" />]);

        waitsForAndRuns (
            () => resultForId(globalSenseResults, "b"),
            () => {
                expect(resultForId(globalSenseResults, "b").distance.inLevel).toBe(1);
                ReactDOM.unmountComponentAtNode(div);
            },
            2000,
            done);
    });
    it ("ignores changes to the dom that do not involve tracked selectors", (done) => {
        let container = null
        let div = document.createElement("div");
        document.body.appendChild(div);
        ReactDOM.render(
                <ChangingMiddle ref={c => container = c} nestDepth={5}
                            atStart={<ContextSensitiveStubSpy key="s" sensors={defaultSensors} />}
                            middle={[<div key="1" />]}
                            atEnd={<div key="e" className="Foo" />} />,
                div);

        expect(resultForId(globalSenseResults, "b").distance.inLevel).toBe(2);
        container.changeMiddle([]);

        waitsForAndRuns (
            () => resultForId(globalSenseResults, "b").distance.inLevel != 2,
            () => {
                expect(resultForId(globalSenseResults, "b").distance.inLevel).toBe(2);
                ReactDOM.unmountComponentAtNode(div);
            },
            250,
            done);
    });


    it ("fails if startInAncestor is specified but no ancestor matches", () => {
        ReactTestUtils.renderIntoDocument (<div>
            <div className="Foo" />
            <ContextSensitiveStubSpy sensors={startingPositionSensors} />
        </div>);
        expect(resultForId(globalSenseResults, "a")).toBeNull();
    });

    it ("ignores neighbouring matches within the ancestor when startInAncestor specified", () => {
        ReactTestUtils.renderIntoDocument (<div>
            <div className="StartHere">
                <div className="Foo" />
                <ContextSensitiveStubSpy sensors={startingPositionSensors} />
            </div>
        </div>);
        expect(resultForId(globalSenseResults, "a")).toBeNull();
    });

    it ("finds matches near to the ancestor selected by startInAncestor that would otherwise be out of range", () => {
        ReactTestUtils.renderIntoDocument (<div>
            <div className="Foo" />
            <div className="StartHere">
                <div>
                    <ContextSensitiveStubSpy sensors={startingPositionSensors} />
                </div>
            </div>
        </div>);
        expect(resultForId(globalSenseResults, "a")).toHaveMember("distance");
    });

});
