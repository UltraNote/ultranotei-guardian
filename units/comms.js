// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
// Copyright (c) 2020, The UltraNote Developers
//
// Please see the included LICENSE file for more information.

const vsprintf = require("sprintf-js").vsprintf;
const moment = require("moment");
const XUNI = require("ultranotei-api");

module.exports = {
  RpcCommunicator: function (configOpts, errorCallback) {
    // create the XUNI api interface object
    var CCXApi = new XUNI("http://127.0.0.1", "3333", configOpts.node.port, (configOpts.node.rfcTimeout || 5) * 1000);
    var timeoutCount = 0;
    var IsRunning = false;
    var lastHeight = 0;
    var infoData = null;
    var lastTS = moment();

    this.stop = function () {
      IsRunning = false;
    };

    this.getData = function () {
      return infoData;
    };

    this.start = function () {
      IsRunning = true;
      timeoutCount = 0;
      lastTS = moment();
      checkAliveAndWell();
    };

    function checkAliveAndWell() {
      if (IsRunning) {
        CCXApi.info().then(data => {
          var heightIsOK = true;
          infoData = data;

          if (lastHeight !== data.height) {
            console.log(vsprintf("Current block height is %d", [data.height]));
            lastHeight = data.height;
            lastTS = moment();
          } else {
            var duration = moment.duration(moment().diff(lastTS));

            if (duration.asSeconds() > (configOpts.restart.maxBlockTime || 1800)) {
              errorCallback(vsprintf("No new block has be seen for more then %d minutes", [(configOpts.restart.maxBlockTime || 1800) / 60]));
              heightIsOK = false;
            }
          }

          if (heightIsOK) {
            if (data.status !== "OK") {
              errorCallback("Status is: " + data.status);
            } else {
              // reset count and repeat
              timeoutCount = 0;
              setTimeout(() => {
                checkAliveAndWell();
              }, 5000);
            }
          }
        }).catch(err => {
          if (IsRunning) {
            timeoutCount++;
            if (timeoutCount >= 3) {
              errorCallback(err);
            }
          }
        });
      }
    }
  }
};
