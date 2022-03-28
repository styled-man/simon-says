import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { Settings } from "./data/settings";

const settings = new Settings();

// add settings to local storage
if (!localStorage.getItem(settings.localStorageKey)) {
    settings.resetToDefault()
}

ReactDOM.render(
    <React.StrictMode>
        <App settings={settings}/>
    </React.StrictMode>,
    document.getElementById("root")
);
