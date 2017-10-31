import React from 'react';
import ReactDOM from 'react-dom';
import ContextSensitiveStub from "./ContextSensitiveStub";
import { resultForId, evaluateCondition } from "./SenseResultUtils";

export default class ContextSensitiveRenderer extends ContextSensitiveStub
{
    constructor (props)
    {
        super(props);
        this.runRenderingScripts = this.runRenderingScripts.bind(this);
    }

    // we don't actually update the state when we detect a change in sensor results;
    // this prevents an unnecessary rerender step.  Instead, we hold the data that
    // would be in the state in a property:
    sensorStateChanged ()
    {
        this.sensorData = this.calculateState ();
        if (this.props.renderedImageCache) {
            let selection = this.selectRenderScripts ();
            let key = this.makeCacheKey (selection);
            let cached = this.props.renderedImageCache.get(key);
            if (cached) {
                this.setState ({
                    cachedImageKey: key,
                    cachedImageURL: cached.url
                });
                return;
            }
            else if (this.state.cachedImageURL) // stop using current cache
            {
                this.setState ({
                    cachedImageKey: null,
                    cachedImageURL: null
                });
            }
        }
        if (this.canvas)
            window.requestAnimationFrame(this.runRenderingScripts);
    }
    // and the updateState method needs to be able to find the data to check whether
    // anything changed...
    getLastState ()
    {
        return this.sensorData;
    }

    setElement (canvas)
    {
        super.setElement(canvas);
        // keep our own copy so we don't need to depend on what the superclass does with the element!
        this.canvas = canvas;
        // if the canvas has changed, we need to rerender.
        window.requestAnimationFrame(this.runRenderingScripts);
    }

    renderWithSenseResults (senseResults)
    {
        if (this.state.cachedImageURL)
            return <img src={this.state.cachedImageURL} className={this.state.cachedImageKey.replace(':',' ')} />;

        return <canvas ref={this.setElement} />;
    }

    selectRenderScripts ()
    {
        let senseResults = this.latestSenseResults;
        let selectedScripts = [];
        for (let script of this.props.scripts)
        {
            if (script.when && !evaluateCondition (script.when, senseResults)) continue;
            if (script.renderer) {
                selectedScripts.push (script);
            }
            if (script.isTerminal) return;
        }
        return selectedScripts;
    }

    runRenderingScripts ()
    {
        let selection = this.selectRenderScripts ();
        let cachedImageKey = this.makeCacheKey (selection);
        let cachedBlob = this.props.renderedImageCache && this.props.renderedImageCache.get(cachedImageKey);
        if (cachedBlob)
        {
            this.setState ({
                cachedImageKey: cachedImageKey,
                cachedImageURL: cachedBlob.url
            });
            return; // will trigger a rerender to use the cached version
        }

        let context = this.canvas.getContext(this.props.contextType || "2d");
        selection.forEach (script => script.renderer (context, this.canvas, this));

        if (this.props.renderedImageCache) {
            this.canvas.toBlob (blob => {
                // another script may have rendered the same item while we were generating the blob; use that if it did...
                cachedBlob = this.props.renderedImageCache.get(cachedImageKey);
                if (cachedBlob) {
                    this.setState ({
                        cachedImageKey: cachedImageKey,
                        cachedImageURL: cachedBlob.url
                    });
                    return; // will trigger a rerender to use the cached version                    
                }

                let url = URL.createObjectURL(blob);

                this.props.renderedImageCache.set (cachedImageKey, {
                    blob: blob,
                    url: url
                });
                this.setState ({
                    cachedImageKey: cachedImageKey,
                    cachedImageURL: url
                });
            })

        }
    }
    makeCacheKey (selection)
    {
        return selection.map (s => s.name).join(":");
    }
}
