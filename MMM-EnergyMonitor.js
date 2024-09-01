"use strict";
/* Magic Mirror
 * Module: MMM-EnergyMonitor
 *
 * By Beh (hello@beh.wtf)
 * MIT Licensed.
 */

Module.register("MMM-EnergyMonitor", {
    defaults: {
        name: "MMM-EnergyMonitor",
        hidden: false,
        updateInterval: 3000,
        energyStorage: true,
        width: "600px",
        height: "500px",
        lineWidth: "7px",
        resetCycles: 4,
        logNotifications: false,
        wattConversionOptions: {
            enabled: true,
            threshold: 1200,
            numDecimalDigits: 2,
        },
        iconCssClasses: {
            home: "fas fa-home",
            grid: "fas fa-plug",
            energyStorage: "fas fa-battery-half",
            localPowerSource: "fas fa-solar-panel"
        }
    },

    requiresVersion: "2.17.0", // Required version of MagicMirror

    start: function () {
        this.currentData = {
            battery: 0,
            home: 0,
            grid: 0,
            solar: 0
        };

        this.resetCounter = {
            battery: 0,
            grid: 0,
            solar: 0
        };

        Log.log("MMM-EnergyMonitor started.");
        this.scheduleUpdate();

        this.loaded = true;
    },

    scheduleUpdate: function () {
        setInterval(() => {
            this.updateDom();
            this.trackValueReset();
        }, this.config.updateInterval);
    },

    trackValueReset: function() {
        for (const dataType in this.resetCounter) {
            if (this.resetCounter.hasOwnProperty(dataType)) {
                
                if(this.resetCounter[dataType] === this.config.resetCycles) {
                    this.currentData[dataType] = 0;
                    this.resetCounter[dataType] = 0;
                }

                this.resetCounter[dataType] += 1;
            }
        }
    },

    getDom: function () {
        // create element wrapper for show into the module
        const wrapper = document.createElement("div");
        wrapper.id = "energymonitor-wrapper";
        wrapper.style.setProperty("--width", this.config.width);
        wrapper.style.setProperty("--height", this.config.height);
        wrapper.style.setProperty("--line-width", this.config.lineWidth);

        this.addIcons(wrapper);

        const solarLine = this.generateSolarLine();
        wrapper.appendChild(solarLine);

        const homeLine = this.generateHomeLine();
        wrapper.appendChild(homeLine);

        const gridLine = this.generateGridLine();
        wrapper.appendChild(gridLine);

        if(this.config.energyStorage) {
            const batteryLine = this.generateBatteryLine();
            wrapper.appendChild(batteryLine);
        }

        return wrapper;
    },

    addIcons: function(wrapper) {
        // Solar Icon
        const solarPanel = document.createElement("div");
        solarPanel.className = "icon horizontal left";

        const solarPanelIcon = document.createElement("i");
        solarPanelIcon.className = this.config.iconCssClasses.localPowerSource;
        solarPanel.appendChild(solarPanelIcon);
        wrapper.appendChild(solarPanel);

        // Home Icon
        const home = document.createElement("div");
        home.className = "icon vertical top";

        const homeIcon = document.createElement("i");
        homeIcon.className = this.config.iconCssClasses.home;
        home.appendChild(homeIcon);
        wrapper.appendChild(home);

        // Plug Icon
        const grid = document.createElement("div");
        grid.className = "icon horizontal right";

        const gridIcon = document.createElement("i");
        gridIcon.className = this.config.iconCssClasses.grid;
        grid.appendChild(gridIcon);
        wrapper.appendChild(grid);

        // Battery Icon
        const battery = document.createElement("div");
        battery.className = "icon vertical bottom";

        const batteryIcon = document.createElement("i");
        batteryIcon.className = this.config.iconCssClasses.energyStorage;
        battery.appendChild(batteryIcon);
        wrapper.appendChild(battery);
    },

    generateSolarLine: function() {
        const solarLine = document.createElement("div");
        solarLine.classList.add("line", "horizontal", "left");
        
        const solarLabel = document.createElement("div");
        solarLabel.id = "solar-label";
        solarLabel.classList.add("label");
        solarLabel.innerHTML = `${this.getWattString(this.currentData.solar)} <br>`;
        solarLabel.innerHTML += this.translate("SOLAR_PRODUCING");
        solarLine.appendChild(solarLabel);

        if(this.currentData.solar > 0) {
            solarLine.classList.add("active");

            const solarArrowOut = document.createElement("i");
            solarArrowOut.classList.add("arrow", "right", "active");
            solarLine.appendChild(solarArrowOut);
        } else {
            solarLine.classList.add("dimmed");
        }

        return solarLine;
    },

    generateHomeLine: function() {
        this.calculateHomeConsumption();
        const homeLine = document.createElement("div");
        homeLine.classList.add("line", "vertical", "up");
        
        const homeLabel = document.createElement("div");
        homeLabel.id = "home-label";
        homeLabel.classList.add("label");
        homeLabel.innerHTML = `${this.getWattString(this.currentData.home)}<br>`;
        homeLabel.innerHTML += this.translate("HOME_CONSUMPTION");
        homeLine.appendChild(homeLabel);

        if(this.currentData.home > 0) {
            homeLine.classList.add("active");

            const homeArrowIn = document.createElement("div");
            homeArrowIn.classList.add("arrow", "up", "active");
            homeLine.appendChild(homeArrowIn);
        } else {
            homeLine.classList.add("dimmed");
        }

        return homeLine;
    },

    generateGridLine: function() {
        const gridLine = document.createElement("div");
        gridLine.classList.add("line", "horizontal", "right");
                
        if(this.currentData.grid !== 0)
            gridLine.classList.add("active");

        const gridLabel = document.createElement("div");
        gridLabel.id = "grid-label";
        gridLabel.classList.add("label");
        gridLabel.innerHTML = `${this.getWattString(Math.abs(this.currentData.grid))}<br>`;
        gridLine.appendChild(gridLabel);

        // Positive value means feeding to grid
        if(this.currentData.grid > 0) {
            gridLabel.innerHTML += this.translate("GRID_BACKFEEDING");
            gridLabel.classList.add("font-green");

            const gridArrowOut = document.createElement("div");
            gridArrowOut.classList.add("arrow", "right", "active");
            gridLine.appendChild(gridArrowOut);
        } else if(this.currentData.grid < 0) {
            gridLabel.innerHTML += this.translate("GRID_CONSUMPTION");
            gridLabel.classList.add("font-red");

            const gridArrowIn = document.createElement("div");
            gridArrowIn.classList.add("arrow", "left", "active");
            gridLine.appendChild(gridArrowIn);
        } else {
            gridLabel.innerHTML += this.translate("GRID_IDLE");
            gridLine.classList.add("dimmed");
        }

        return gridLine;
    },

    generateBatteryLine: function() {
        const batteryLine = document.createElement("div");
        batteryLine.classList.add("line", "vertical", "down");

        const batteryLabel = document.createElement("div");
        batteryLabel.id = "battery-label";
        batteryLabel.classList.add("label");
        batteryLabel.innerHTML = `${this.getWattString(Math.abs(this.currentData.battery))}<br>`;
        batteryLine.appendChild(batteryLabel);

        if(this.currentData.battery !== 0)
            batteryLine.classList.add("active");

        // Positive value means charging battery
        if(this.currentData.battery > 0) {
            batteryLabel.innerHTML += this.translate("BATTERY_CHARGING");
            batteryLabel.classList.add("font-green");

            const batteryArrowIn = document.createElement("i");
            batteryArrowIn.classList.add("fas", "fa-caret-down", "arrow", "down", "active");
            batteryLine.appendChild(batteryArrowIn);
        } else if(this.currentData.battery < 0) {
            batteryLabel.innerHTML += this.translate("BATTERY_DISCHARGING");
            batteryLabel.classList.add("font-red");

            const batteryArrowOut = document.createElement("i");
            batteryArrowOut.classList.add("fas", "fa-caret-up", "arrow", "up", "active");
            batteryLine.appendChild(batteryArrowOut);
        } else {
            batteryLabel.innerHTML += this.translate("BATTERY_IDLE");
            batteryLine.classList.add("dimmed");
        }

        return batteryLine;
    },

    calculateHomeConsumption: function() {
        this.currentData.home = this.currentData.solar - this.currentData.grid - this.currentData.battery;
    },

    getWattString: function (value) {
        const wattConversionOptions = this.config.wattConversionOptions;
        if (wattConversionOptions.enabled && value > wattConversionOptions.threshold) {
          return `${(value / 1000).toFixed(wattConversionOptions.numDecimalDigits)} KW`;
        }
    
        return `${Math.round(value)} W`;
    },

    getStyles: function () {
        return ["MMM-EnergyMonitor.css", "font-awesome.css"];
    },

    // Load translations files
    getTranslations: function () {
        return {
            en: "translations/en.json",
            de: "translations/de.json",
        };
    },

    validateNumberPayload(notification, payload, sender, ) {
        if(typeof payload !== "number") {
            if(this.config.logNotifications)
                Log.log(`EnergyMonitor received data that is NaN: ${payload} from sender: ${sender.name} via notification: ${notification}`);
            
            return false;
        } else {
            if(this.config.logNotifications)
                Log.log(`EnergyMonitor received data: ${payload} from sender: ${sender.name} via notification: ${notification}`);
            
            return true;
        }
    },

    notificationReceived(notification, payload, sender) {
        if(!this.loaded)
            return;
        
        // Unit: Watt | negative: discharge | positive: charge
        if (notification === "MMM-EnergyMonitor_ENERGY_STORAGE_POWER_UPDATE") {
            if(!this.validateNumberPayload(notification, payload, sender))
                return;

            this.currentData.battery = payload;
            this.resetCounter.battery = 0;
        }

        // Unit: Watt | negative: consume from grid | positive: feed to grid
        if (notification === "MMM-EnergyMonitor_GRID_POWER_UPDATE") {
            if(!this.validateNumberPayload(notification, payload, sender))
                return;

            this.currentData.grid = payload;
            this.resetCounter.grid = 0;
        }

        // Unit: Watt | cannot be negative
        if (notification === "MMM-EnergyMonitor_SOLAR_POWER_UPDATE") {
            if(!this.validateNumberPayload(notification, payload, sender))
                return;

            this.currentData.solar = payload < 0 ? 0 : payload ;
            this.resetCounter.solar = 0;
        }
    },
});
