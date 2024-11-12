// PhoneDetect by Pierre Gode
const { exec } = require("child_process");
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
  start () {
    console.log("MMM-PhoneDetect helper started...");
    this.lastOnlineTime = Date.now(); // Initialize with current time
  },

  socketNotificationReceived (notification, payload) {
    if (notification === "CONFIG") {
      this.config = payload;
      this.scheduleCheck();
    }
  },

  scheduleCheck () {
    setInterval(() => {
      this.checkPhonePresence();
    }, this.config.checkInterval);
  },

  performArpScan () {
    return new Promise((resolve, reject) => {
      exec("ping -c 2 -W 1 192.168.1.186", (error, stdout) => {
        if (error) {
          //console.error(`MMM-PhoneDetect: Error performing ARP scan: ${error.message}` + stdout);
          resolve(stdout);
        } else {
	  //console.error("MMM-PhoneDetect: no Error performing arp scan" + stdout);
          resolve(stdout);
        }
      });
    });
  },

   performArpScan2 () {
    return new Promise((resolve, reject) => {
      exec("ping -c 2 -W 1 192.168.205", (error, stdout) => {
        if (error) {
          //console.error(`MMM-PhoneDetect: Error performing ARP scan2: ${error.message}` + stdout);
          resolve(stdout);
        } else {
	  //console.error("MMM-PhoneDetect: no Error performing arp scan2" + stdout);
          resolve(stdout);
        }
      });
    });
  },

  checkPhonePresence () {
    this.performArpScan()
      .then((arpScanOutput) => {
        const arpPhoneStatuses = arpScanOutput.toLowerCase().includes("2 received");
	console.error(`MMM-PhoneDetect: arp statuses` + arpPhoneStatuses);
        this.performArpScan2().then((arpScan2Output) => {
          const arpPhoneStatuses2 = arpScan2Output.toLowerCase().includes("2 received");
	  console.error(`MMM-PhoneDetect: arp 2 statuses` + arpPhoneStatuses2);
	  const combinedPhoneStatuses = { mac: "101", isOnline: arpPhoneStatuses || arpPhoneStatuses2 };
          console.error(`MMM-PhoneDetect: combined arp statuses ` + combinedPhoneStatuses);
          if (combinedPhoneStatuses.isOnline) {
            //this.turnMirrorOn();
            this.lastOnlineTime = Date.now();
	    console.error("MMM-PhoneDetect: im online");
          } else {
            this.checkAndTurnOffMirror();
	    console.error("MMM-PhoneDetect: im offline");
          }
          this.sendSocketNotification("PHONE_PRESENCE", combinedPhoneStatuses);
        });
      })
      .catch((error) => {
      });
  },

  checkAndTurnOffMirror () {
    if (Date.now() - this.lastOnlineTime >= this.config.nonResponsiveDuration && !this.isWithinIgnoreHours()) {
      this.turnMirrorOff();
    }
  },

  turnMirrorOn () {
    if (!this.isWithinIgnoreHours()) {
      console.log("MMM-PhoneDetect: Turning on the mirror...");
      exec(this.config.turnOnCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`MMM-PhoneDetect: Error turning on the mirror: ${error}`);
        } else {
          console.log("MMM-PhoneDetect: Mirror turned on.");
        }
      });
    } else {
      console.log("MMM-PhoneDetect: Ignoring turn on command due to ignore hours.");
    }
  },

  turnMirrorOff () {
    if (!this.isWithinIgnoreHours()) {
      console.log("MMM-PhoneDetect: Turning off the mirror...");
      exec(this.config.turnOffCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`MMM-PhoneDetect: Error turning off the mirror: ${error}`);
        } else {
          console.log("MMM-PhoneDetect: Mirror turned off.");
        }
      });
    } else {
      console.log("MMM-PhoneDetect: Ignoring turn off command due to ignore hours.");
    }
  },

  isWithinIgnoreHours () {
    const currentHour = new Date().getHours();
    const { startignoreHour, endignoreHour } = this.config;

    if (startignoreHour < endignoreHour) {
      return currentHour >= startignoreHour && currentHour < endignoreHour;
    } else {
      return currentHour >= startignoreHour || currentHour < endignoreHour;
    }
  }
});
