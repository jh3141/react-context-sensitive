import React from 'react';
import ReactDOM from 'react-dom'
import ReactTestUtils from 'react-dom/test-utils';
import ContextSensitiveFactory from '../src/ContextSensitiveFactory.jsx';

var defaultSensors = [
    { id: "a", selector: ".Foo", direction: "start", maxInLevel: 1, maxUp: 1 },
    { id: "b", selector: ".Foo", direction: "end", maxInLevel: 1, maxUp: 1}
];

describe ("<ContextSensitiveFactory/>", () => {
    it ("uses a default value if no matching factories", () => {
        let component = ReactTestUtils.renderIntoDocument (
            <ContextSensitiveFactory sensors={defaultSensors}
                factories={[]}
                defaultValue={<span>Default</span>}
                />
        );
        let element = ReactDOM.findDOMNode(component);
        expect(element.textContent).toBe("Default");
    });
    it ("matches a factory if it names a single true condition", () => {
        let component = ReactTestUtils.renderIntoDocument (<div>
            <div className="Foo" />
            <ContextSensitiveFactory sensors={defaultSensors}
                factories={[
                    {when:"a",use:<span>Hello</span>}
                ]}
                logMatchFailures={true}
                />
        </div>);
        let element = ReactDOM.findDOMNode(component);
        expect(element.textContent).toBe("Hello");
    });
    it ("does not render the default value when factories match", () => {
        let component = ReactTestUtils.renderIntoDocument (<div>
            <div className="Foo" />
            <ContextSensitiveFactory sensors={defaultSensors}
                factories={[
                    {when:"a",use:<span>Hello</span>}
                ]}
                logMatchFailures={true}
                defaultValue={<span>Default</span>}/>
        </div>);
        let element = ReactDOM.findDOMNode(component);
        expect(element.textContent).toBe("Hello");
    });
    it ("renders the first matching factory only when multiple matches exist", () => {
        let component = ReactTestUtils.renderIntoDocument (<div>
            <div className="Foo" />
            <ContextSensitiveFactory sensors={defaultSensors}
                factories={[
                    {when:"a",use:<span>Hello</span>},
                    {when:"b",use:<span>World</span>}
                ]}
                logMatchFailures={true}
                />
            <div className="Foo" />
        </div>);
        let element = ReactDOM.findDOMNode(component);
        expect(element.textContent).toBe("Hello");
    });
    it ("does not render factories that do not match", () => {
        let component = ReactTestUtils.renderIntoDocument (<div>
            <ContextSensitiveFactory sensors={defaultSensors}
                factories={[
                    {when:"a",use:<span>Hello</span>},
                    {when:"b",use:<span>World</span>}
                ]}
                logMatchFailures={true}
                />
            <div className="Foo" />
        </div>);
        let element = ReactDOM.findDOMNode(component);
        expect(element.textContent).toBe("World");
    });
    it ("does not match when 'a^b' is used and only 'a' matches", () => {
        let component = ReactTestUtils.renderIntoDocument (<div>
            <div className="Foo" />
            <ContextSensitiveFactory sensors={defaultSensors}
                factories={[
                    {when:"a^b",use:<span>Both</span>},
                    {when:"a",use:<span>One</span>}
                ]}
                logMatchFailures={true}
                />
        </div>);
        let element = ReactDOM.findDOMNode(component);
        expect(element.textContent).toBe("One");
    });
    it ("does not match when 'a^b' is used and only 'b' matches", () => {
        let component = ReactTestUtils.renderIntoDocument (<div>
            <ContextSensitiveFactory sensors={defaultSensors}
                factories={[
                    {when:"a^b",use:<span>Both</span>},
                    {when:"b",use:<span>One</span>}
                ]}
                logMatchFailures={true}
                />
            <div className="Foo" />
        </div>);
        let element = ReactDOM.findDOMNode(component);
        expect(element.textContent).toBe("One");
    });
    it ("does match when 'a^b' is used and both match", () => {
        let component = ReactTestUtils.renderIntoDocument (<div>
            <div className="Foo" />
            <ContextSensitiveFactory sensors={defaultSensors}
                factories={[
                    {when:"a^b",use:<span>Both</span>},
                    {when:"b",use:<span>One</span>}
                ]}
                logMatchFailures={true}
                />
            <div className="Foo" />
        </div>);
        let element = ReactDOM.findDOMNode(component);
        expect(element.textContent).toBe("Both");
    });
    it ("does match when 'a+b' is used and a matches", () => {
        let component = ReactTestUtils.renderIntoDocument (<div>
            <div className="Foo" />
            <ContextSensitiveFactory sensors={defaultSensors}
                factories={[
                    {when:"a+b",use:<span>Either</span>},
                    {when:"a",use:<span>One</span>}
                ]}
                logMatchFailures={true}
                />
        </div>);
        let element = ReactDOM.findDOMNode(component);
        expect(element.textContent).toBe("Either");
    });
    it ("does match when 'a+b' is used and b matches", () => {
        let component = ReactTestUtils.renderIntoDocument (<div>
            <ContextSensitiveFactory sensors={defaultSensors}
                factories={[
                    {when:"a+b",use:<span>Either</span>},
                    {when:"b",use:<span>One</span>}
                ]}
                logMatchFailures={true}
                />
            <div className="Foo" />
        </div>);
        let element = ReactDOM.findDOMNode(component);
        expect(element.textContent).toBe("Either");
    });
    it ("does not match when 'a+b' is used and neither matches", () => {
        let component = ReactTestUtils.renderIntoDocument (<div>
            <ContextSensitiveFactory sensors={defaultSensors}
                factories={[
                    {when:"a+b",use:<span>Either</span>},
                ]}
                defaultValue={<span>Neither</span>}
                />
        </div>);
        let element = ReactDOM.findDOMNode(component);
        expect(element.textContent).toBe("Neither");
    });
    it ("matches '!a' when a does not match", () => {
        let component = ReactTestUtils.renderIntoDocument (<div>
            <ContextSensitiveFactory sensors={defaultSensors}
                factories={[
                    {when:"!a",use:<span>Matched</span>},
                ]}
                defaultValue={<span>Not matched</span>}
                />
        </div>);
        let element = ReactDOM.findDOMNode(component);
        expect(element.textContent).toBe("Matched");
    });
    it ("does not match '!a' when a does match", () => {
        let component = ReactTestUtils.renderIntoDocument (<div>
            <div className="Foo" />
            <ContextSensitiveFactory sensors={defaultSensors}
                factories={[
                    {when:"!a", use:<span>Matched</span>},
                ]}
                defaultValue={<span>Not matched</span>}
                />
        </div>);
        let element = ReactDOM.findDOMNode(component);
        expect(element.textContent).toBe("Not matched");
    });
});
