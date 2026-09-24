import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App'
import AIAgentApp from './components/AIAgentApp'
import {initSync} from './sync'
import {polyfill} from "mobile-drag-drop";
import {scrollBehaviourDragImageTranslateOverride} from "mobile-drag-drop/scroll-behaviour";
import "mobile-drag-drop/default.css";

polyfill({
    dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
    holdToDrag: 150,
    tryFindDraggableTarget: (event: TouchEvent) => {
        const target = event.target as HTMLElement | null;
        if (target && target.closest('input, button, select, textarea, .no-drag, [data-no-drag]')) {
            return undefined;
        }
        let el = target;
        while (el && el !== document.body) {
            if (el.getAttribute && el.getAttribute('draggable') === 'false') return undefined;
            if (el.draggable === true || (el.getAttribute && el.getAttribute('draggable') === 'true')) {
                return el;
            }
            el = el.parentElement;
        }
        return undefined;
    }
});

window.addEventListener('touchmove', function () {
}, {passive: false});

initSync(() => {
    window.location.reload();
});

const path = window.location.pathname;

createRoot(document.getElementById('root')!).render(path === '/ai' ? <AIAgentApp/> : <App/>)
