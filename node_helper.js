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
      exec("ping -c 5 -W 2 192.168.0.8", (error, stdout) => {
        if (error) {
          console.error(`MMM-PhoneDetect: Error performing ARP scan: ${error.message}`);
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  },

  checkPhonePresence () {
    this.performArpScan()
      .then((arpScanOutput) => {
        const arpPhoneStatuses = this.config.phones.map((mac) => ({ mac, isOnline: arpScanOutput.toLowerCase().includes(mac.toLowerCase()) }));

        this.performNmapScan().then((nmapScanOutput) => {
          const nmapLines = nmapScanOutput.split("\n").filter((line) => line.includes("MAC Address:"));
          const nmapPhoneStatuses = this.config.phones.map((mac) => {
            const isOnline = nmapLines.some((line) => line.toLowerCase().includes(mac.toLowerCase()));
            return { mac, isOnline };
          });

          const combinedPhoneStatuses = arpPhoneStatuses.map((arpStatus) => {
            const nmapStatus = nmapPhoneStatuses.find((nmapStatus) => nmapStatus.mac === arpStatus.mac);
            return { mac: arpStatus.mac, isOnline: arpStatus.isOnline || (nmapStatus ? nmapStatus.isOnline : false) };
          });

          const anyDeviceOnline = combinedPhoneStatuses.some((status) => status.isOnline);
          if (anyDeviceOnline) {
            this.lastOnlineTime = Date.now();
          } else {
            this.checkAndTurnOffMirror();
          }
          this.sendSocketNotification("PHONE_PRESENCE", combinedPhoneStatuses);
        });
      })
      .catch((error) => {
      });
  },

  checkAndTurnOffMirror () {
    if (Date.now() - this.lastOnlineTime >= this.config.nonResponsiveDuration) {
      this.turnMirrorOff();
    }
  },

  turnMirrorOff () {
      console.log("MMM-PhoneDetect: Turning off the mirror...");
      exec("sudo shutdown -h now", (error, stdout, stderr) => {
        if (error) {
          console.error(`MMM-PhoneDetect: Error turning off the mirror: ${error}`);
        }
      });
  },
});
