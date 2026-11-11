// Runs before the app (a classic script, like boot.js), and doesn't need it. A release can reach a
// device as a new page with the scripts of the version before it: workers from before this file
// existed fetched the page fresh and took everything else from their own cache. Scripts that can't
// run their page leave Kuvert blank or dead, so once the new version has taken over, the page starts
// again on it. A running app decides for itself (js/main.js). The file's name is new on purpose: no
// older cache holds it, so it always arrives with the page it belongs to.
(function () {
  var sw = navigator.serviceWorker;
  if (!sw || !/^https?:$/.test(location.protocol)) return;
  var had = !!sw.controller;
  sw.addEventListener("controllerchange", function () {
    if (!had) return void (had = true); // a first visit: the worker only just arrived
    if (window.kuvert) return; // the app is running and handles this itself
    try {
      // Once a minute at most, so a version that can't start never loops.
      var last = Number(sessionStorage.getItem("kuvert:restarted")) || 0;
      if (Date.now() - last < 60000) return;
      sessionStorage.setItem("kuvert:restarted", String(Date.now()));
    } catch (e) {
      return;
    }
    location.reload();
  });
})();
