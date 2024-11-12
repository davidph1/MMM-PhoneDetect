Module.register("MMM-PhoneDetect", {
  defaults: {
    phones: [], // List of phone MAC addresses to detect
    checkInterval: 5000 // Check for phone presence every 5 seconds
  },

  start () {
    console.log("Starting MMM-PhoneDetect module");
    this.sendSocketNotification("CONFIG", this.config);
    this.onlineDevices = new Set(); // Initialize a set to track online devices
  },

  getDom () {
    const wrapper = document.createElement("div");
    wrapper.className = "phone-dots-container";

    this.config.phones.forEach((phone) => {
      const dot = document.createElement("span");
      dot.className = `phone-dot ${this.onlineDevices.has(phone) ? "online" : "offline"}`;
      dot.id = `dot-${phone}`; // Assign an ID for easier DOM manipulation
      wrapper.appendChild(dot);
    });

    return wrapper;
  },

  socketNotificationReceived (notification, payload) {
    if (notification === "PHONE_PRESENCE") {
      console.log("i got the payload " + payload.mac);
	const dot = document.getElementById(`dot-${payload.mac}`);
        if (dot) {
          if (payload.isOnline) {
            console.log("i got into online section");
	    this.onlineDevices.add(payload.mac);
            dot.className = "phone-dot online";
          } else {
            console.log("i got into offline section");
	    this.onlineDevices.delete(payload.mac);
            dot.className = "phone-dot offline";
          }
        }
      };
  },

  getStyles () {
    return ["MMM-PhoneDetect.css"];
  }
});
