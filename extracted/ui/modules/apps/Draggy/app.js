angular.module('beamng.apps')
.directive('draggy', ['$timeout', function($timeout) {
  // NOTE: StreamsManager is a BeamNG global, NOT an Angular-injectable service.
  // Injecting it via DI throws "Unknown provider: StreamsManagerProvider".

  // Inject CSS once into <head>. We do NOT put a <style> tag inside the
  // template, because with replace:true AngularJS requires the template to
  // have a single root element and a <style> child breaks that (renders blank).
  function injectStyles() {
    if (document.getElementById('draggy-styles')) return;
    var css = [
      '@keyframes dt-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }',
      '.drag-timer-app { box-sizing: border-box; width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column; background: #0a0b0d; color: #fff; font-family: "Roboto Mono", monospace; border-radius: 12px; border: 1px solid #1d1f24; }',
      '.drag-timer-app .dt-header { display: flex; justify-content: space-between; align-items: center; padding: 9px 11px; border-bottom: 1px solid #1a1c20; }',
      '.drag-timer-app .dt-brand { display: flex; align-items: center; gap: 7px; font-weight: 700; letter-spacing: 2px; font-size: 13px; color: #fff; }',
      '.drag-timer-app .dt-dot { width: 9px; height: 9px; border-radius: 50%; background: #00e676; box-shadow: 0 0 9px #00e676; }',
      '.drag-timer-app .dt-dot.run { animation: dt-pulse 0.9s ease-in-out infinite; }',
      '.drag-timer-app .dt-mode { font-size: 12px; background: transparent; color: #9aa0aa; border: 1px solid #2a2d34; padding: 3px 8px; border-radius: 5px; cursor: pointer; letter-spacing: 1px; white-space: nowrap; -webkit-user-select: none; user-select: none; }',
      '.drag-timer-app .dt-mode:hover { color: #fff; border-color: #00e676; }',
      '.drag-timer-app .dt-mode.metric { color: #00e676; border-color: #00e676; }',
      '.drag-timer-app .dt-reset { font-size: 10px; background: transparent; color: #6a6f78; border: 1px solid #2a2d34; padding: 3px 10px; border-radius: 5px; cursor: pointer; letter-spacing: 1px; }',
      '.drag-timer-app .dt-reset:hover { color: #fff; border-color: #00e676; }',
      '.drag-timer-app .dt-hero { text-align: center; padding: 12px 12px 9px; }',
      '.drag-timer-app .dt-status { font-size: 10px; letter-spacing: 4px; color: #5c616b; margin-bottom: 3px; }',
      '.drag-timer-app .dt-status.st-RUN { color: #00e676; }',
      '.drag-timer-app .dt-status.st-STAGED { color: #ffb300; }',
      '.drag-timer-app .dt-status.st-DONE { color: #00e676; }',
      '.drag-timer-app .dt-bigspeed { font-size: 52px; font-weight: 700; line-height: 1; color: #fff; font-variant-numeric: tabular-nums; }',
      '.drag-timer-app .dt-unit { font-size: 15px; color: #5c616b; margin-left: 5px; font-weight: 400; letter-spacing: 1px; }',
      '.drag-timer-app .dt-bigdist { font-size: 12px; color: #7a808a; margin-top: 4px; letter-spacing: 2px; }',
      '.drag-timer-app .dt-results { padding: 4px 13px 6px; }',
      '.drag-timer-app .dt-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #15171b; }',
      '.drag-timer-app .dt-row .lbl { color: #6a6f78; letter-spacing: 1px; font-size: 12px; }',
      '.drag-timer-app .dt-row .val { color: #4c515a; font-size: 13px; font-variant-numeric: tabular-nums; }',
      '.drag-timer-app .dt-row.dt-done .lbl { color: #c2c6cc; }',
      '.drag-timer-app .dt-row.dt-done .val { color: #fff; }',
      '.drag-timer-app .dt-quarter .lbl, .drag-timer-app .dt-quarter .val { font-weight: 700; font-size: 15px; }',
      '.drag-timer-app .dt-quarter.dt-done .val { color: #00e676; }',
      '.drag-timer-app .dt-trap .val { color: #00e676; }',
      '.drag-timer-app .dt-best { margin-top: auto; padding: 9px 13px; background: rgba(0,230,118,0.08); border-top: 1px solid #1a1c20; font-size: 11px; color: #00e676; text-align: center; letter-spacing: 1px; }'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'draggy-styles';
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }
  injectStyles();

  return {
    template: [
      '<div class="bngApp drag-timer-app">',
      '  <div class="dt-header">',
      '    <button class="dt-mode" ng-click="toggleDist()" title="Toggle ⅛+¼ / ¼+½ mile">{{ distMode===\'half\' ? (metric ? \'400–1000\' : \'¼–½\') : (metric ? \'200–400\' : \'⅛–¼\') }}</button>',
      '    <button class="dt-mode dt-units" ng-class="{metric: metric}" ng-click="toggleUnits()" title="Switch between mph/ft and km\/h/m">{{ metric ? \'KM\/H\' : \'MPH\' }}</button>',
      '    <div class="dt-brand"><span class="dt-dot" ng-class="{run: status===\'RUN\'}"></span>DRAGGY</div>',
      '    <button class="dt-reset" ng-click="reset()">RESET</button>',
      '  </div>',
      '  <div class="dt-hero">',
      '    <div class="dt-status" ng-class="\'st-\' + status">{{ status }}</div>',
      '    <div class="dt-bigspeed">{{ liveSpeed || \'0.0\' }}<span class="dt-unit">{{ metric ? \'km/h\' : \'mph\' }}</span></div>',
      '    <div class="dt-bigdist">{{ liveDist || \'0\' }} {{ metric ? \'M\' : \'FT\' }}</div>',
      '  </div>',
      '  <div class="dt-results">',
      '    <div class="dt-row" ng-class="{\'dt-done\': run.t060}">',
      '      <span class="lbl">{{ metric ? \'0–100\' : \'0–60\' }}</span>',
      '      <span class="val">{{ run.t060 ? (run.t060 | number:2) + \'s\' : \'—\' }}</span>',
      '    </div>',
      '    <div class="dt-row" ng-class="{\'dt-done\': roll.time}">',
      '      <span class="lbl">{{ metric ? \'100–200\' : \'60–130\' }}</span>',
      '      <span class="val">{{ roll.time ? (roll.time | number:2) + \'s\' : (roll.counting ? (roll.live | number:1) + \'s…\' : \'—\') }}</span>',
      '    </div>',
      '    <div class="dt-row" ng-if="distMode===\'eighth\'" ng-class="{\'dt-done\': run.teighth}">',
      '      <span class="lbl">{{ metric ? \'200 M\' : \'⅛ MILE\' }}</span>',
      '      <span class="val">{{ run.teighth ? (run.teighth | number:2) + \'s\' : \'—\' }}</span>',
      '    </div>',
      '    <div class="dt-row" ng-class="{\'dt-done\': run.tquarter, \'dt-quarter\': distMode===\'eighth\'}">',
      '      <span class="lbl">{{ metric ? \'400 M\' : \'¼ MILE\' }}</span>',
      '      <span class="val">{{ run.tquarter ? (run.tquarter | number:2) + \'s\' : \'—\' }}</span>',
      '    </div>',
      '    <div class="dt-row dt-quarter" ng-if="distMode===\'half\'" ng-class="{\'dt-done\': run.thalf}">',
      '      <span class="lbl">{{ metric ? \'1 KM\' : \'½ MILE\' }}</span>',
      '      <span class="val">{{ run.thalf ? (run.thalf | number:2) + \'s\' : \'—\' }}</span>',
      '    </div>',
      '    <div class="dt-row dt-trap" ng-if="run.trapMps">',
      '      <span class="lbl">TRAP</span>',
      '      <span class="val">{{ speedDisp(run.trapMps) }} {{ metric ? \'km/h\' : \'mph\' }}</span>',
      '    </div>',
      '  </div>',
      '  <div class="dt-best" ng-if="best[bestKey()]">BEST {{ distMode===\'half\' ? (metric ? \'1KM\' : \'½\') : (metric ? \'400M\' : \'¼\') }}&nbsp;&nbsp;{{ best[bestKey()].time | number:2 }}s @ {{ speedDisp(best[bestKey()].trapMps) }} {{ metric ? \'km/h\' : \'mph\' }}</div>',
      '</div>'
    ].join('\n'),
    replace: true,
    restrict: 'EA',
    link: function(scope) {
      StreamsManager.add(['electrics']);

      // --- State ---
      var MPS_TO_MPH = 2.23694;
      var MPS_TO_KMH = 3.6;
      var EIGHTH_MILE_M  = 201.168;
      var QUARTER_MILE_M = 402.336;
      var HALF_MILE_M    = 804.672;
      // Metric mode times the real metric benchmarks, not mile conversions:
      // 0-400 m ("zero-yon", carwow 400m) with a 200 m split, and the
      // classic European standing kilometer (0-1000 m) as the long distance.
      var M_SPLIT   = 200;
      var M_SHORT   = 400;
      var M_LONG    = 1000;
      var ROLLOUT_M = 0.3048; // 1 ft rollout, like real Dragy

      // Display modes (toggled by the top-left button).
      // distMode: 'eighth' -> shows ⅛ + ¼ mile (finish at ¼)
      //           'half'   -> shows ¼ + ½ mile (finish at ½)
      // metric:   false -> mph, intervals 0–60 / 60–130
      //           true  -> km/h, intervals 0–100 / 100–200
      // Restore saved preferences (fails silently if storage is unavailable)
      function loadPref(key, fallback) {
        try { var v = localStorage.getItem(key); return v === null ? fallback : v; }
        catch (err) { return fallback; }
      }
      function savePref(key, value) {
        try { localStorage.setItem(key, value); } catch (err) {}
      }
      scope.distMode = loadPref('draggyDistMode', 'eighth') === 'half' ? 'half' : 'eighth';
      scope.metric = loadPref('draggyMetric', '0') === '1';

      // Split/finish distances depend on the unit system, which each run
      // locks in at launch so flipping units mid-run can't corrupt a time.
      function splitDistM(r)  { return r.metric ? M_SPLIT : EIGHTH_MILE_M; }
      function shortDistM(r)  { return r.metric ? M_SHORT : QUARTER_MILE_M; }
      function longDistM(r)   { return r.metric ? M_LONG  : HALF_MILE_M; }
      function finishDistM(r) { return scope.distMode === 'half' ? longDistM(r) : shortDistM(r); }
      // Best-run memory is kept separately per unit system: a 400 m time is
      // not comparable with a 402.3 m quarter-mile time.
      scope.bestKey = function() { return scope.distMode + (scope.metric ? 'M' : ''); };

      // Convert a speed in m/s to the current display unit string.
      scope.speedDisp = function(mps) {
        if (mps == null) return '';
        return (mps * (scope.metric ? MPS_TO_KMH : MPS_TO_MPH)).toFixed(1);
      };

      function freshRun() {
        return {
          metric: scope.metric, // unit system locked in for this run
          armed: false,   // staged: stopped with throttle, waiting to clear rollout
          armDist: 0,     // ground distance at the moment we armed
          active: false,
          done: false,    // crossed the finish line for the current dist mode
          startSpeed: 0,
          startTime: null,
          startDist: 0,
          odometer: 0,
          // results (the high-speed interval lives in scope.roll, not here)
          t060: null,
          teighth: null, tquarter: null, thalf: null,
          trapMps: null,  // speed at the finish line, stored in m/s
          // milestones hit
          hitLow: false,
          hitEighth: false, hitQuarter: false, hitHalf: false,
        };
      }

      scope.run = freshRun();
      // Rolling high-speed interval (60-130 mph / 100-200 km/h), fully
      // independent of launch runs: arms whenever speed is below the low
      // threshold, counts (live) once it crosses it, locks the time at the
      // high threshold, and clears + re-arms as soon as speed drops back
      // below the low threshold. Works from rolling starts.
      scope.roll = { time: null, live: null, counting: false, below: true, metric: false, startT: 0 };
      function rollReset() {
        scope.roll.time = null; scope.roll.live = null;
        scope.roll.counting = false; scope.roll.below = true;
      }
      scope.best = { eighth: null, half: null, eighthM: null, halfM: null }; // per dist mode and unit system
      scope.status = 'READY';
      scope.liveSpeed = '0.0';
      scope.liveDist = '0';

      // --- Header buttons: distance mode and unit system ------------------
      scope.toggleDist = function() {
        scope.distMode = scope.distMode === 'eighth' ? 'half' : 'eighth';
        savePref('draggyDistMode', scope.distMode);
      };
      scope.toggleUnits = function() {
        scope.metric = !scope.metric;
        savePref('draggyMetric', scope.metric ? '1' : '0');
      };

      // --- Sim-time clock ---------------------------------------------------
      // Wall-clock (Date.now) drifts under slow-mo/fast-mo and keeps ticking
      // while paused. Instead we integrate a sim clock: each frame we add the
      // wall delta scaled by the simulation time scale, and add nothing while
      // paused. simScale is polled cheaply from the game-engine Lua a few times
      // a second (1 = realtime, 0.5 = slowmo, 2 = fast, 0 = paused). If the API
      // isn't available we fall back to scale 1 (plain wall clock).
      var simClock = 0;          // accumulated simulation seconds
      var lastWall = null;       // previous Date.now() in seconds
      var simScale = 1;          // current time scale (0 when paused)
      var pollCounter = 0;

      // Ground distance (m), integrated from true speed (airspeed) rather than
      // the wheel-based odometer. The odometer counts wheel rotation, so
      // wheelspin inflates it — spinning tires would false-launch and trip the
      // finish line early. Integrating actual ground speed measures how far the
      // *car* has moved, immune to wheelspin, like a real Dragy's GPS.
      var groundDist = 0;

      // Auto-reset: clear the run after this many sim-seconds off the throttle.
      var AUTO_RESET_S = 10;
      var THROTTLE_OFF = 0.05;
      var idleStart = null;      // simClock time the throttle was released

      // Is there anything worth clearing? (don't auto-reset a pristine run)
      function runHasData(r) {
        return r.active || r.armed || r.done || r.hitLow ||
               r.hitEighth || r.hitQuarter || r.hitHalf ||
               r.t060 != null ||
               r.teighth != null || r.tquarter != null || r.thalf != null;
      }

      function pollSimScale() {
        if (typeof bngApi === 'undefined' || !bngApi.engineLua) return;
        // NOTE: engineLua inlines this as an expression argument, so it must
        // NOT start with `return` (that's a Lua syntax error here).
        bngApi.engineLua(
          '(simTimeAuthority and (simTimeAuthority.getPause() and 0 or simTimeAuthority.getReal())) or 1',
          function(v) { if (typeof v === 'number') simScale = v; }
        );
      }

      scope.reset = function() {
        scope.run = freshRun();
        scope.status = 'READY';
        scope.liveDist = '0';
        idleStart = null;
      };

      // Vehicle respawn/recover (Ctrl+R / insert) and vehicle switches fully
      // reset the timers; a new vehicle also clears the session bests.
      scope.$on('VehicleReset', function() {
        scope.reset(); rollReset();
      });
      scope.$on('VehicleFocusChanged', function() {
        scope.reset(); rollReset();
        scope.best = { eighth: null, half: null, eighthM: null, halfM: null };
      });

      scope.$on('streamsUpdate', function(event, streams) {
        var e = streams.electrics;
        if (!e) return;

        var speed   = e.airspeed || 0;   // m/s true speed
        var throttle = e.throttle_input || 0;
        var run     = scope.run;

        // Advance the sim clock by the scaled wall delta. Gaps from pause or
        // frame hitches (dt > 0.25s) are dropped so they can't inject time.
        // The same scaled delta integrates ground distance (speed * dt) so
        // distance and time stay consistent under slow-mo / fast-mo.
        if ((pollCounter++ % 10) === 0) pollSimScale();
        var wallNow = Date.now() / 1000;
        if (lastWall !== null) {
          var dt = wallNow - lastWall;
          if (dt > 0 && dt < 0.25) {
            var sdt = dt * simScale;
            simClock   += sdt;
            groundDist += speed * sdt;   // true car distance, not wheel rotation
          }
        }
        lastWall = wallNow;
        var now = simClock; // all run timing below is in sim seconds
        var odo = groundDist; // meters of actual car travel (wheelspin-immune)

        // Live speed always updates, like a real Dragy
        scope.liveSpeed = scope.speedDisp(speed);

        // --- Rolling high-speed interval (independent of launch runs) ---
        var roll = scope.roll;
        var rollMetric = roll.counting ? roll.metric : scope.metric;
        var rollLow  = rollMetric ? 100 / MPS_TO_KMH : 60  / MPS_TO_MPH;
        var rollHigh = rollMetric ? 200 / MPS_TO_KMH : 130 / MPS_TO_MPH;
        if (speed < rollLow) {
          // below the low threshold: clear any previous result and re-arm
          if (roll.counting || roll.time !== null) rollReset();
          roll.below = true;
        } else {
          if (roll.below && !roll.counting && roll.time === null) {
            // crossed the low threshold from below: the clock starts
            roll.counting = true;
            roll.metric   = scope.metric; // lock the unit for this attempt
            roll.startT   = now;
          }
          roll.below = false;
          if (roll.counting) {
            roll.live = now - roll.startT;
            if (speed >= rollHigh) {
              roll.time     = roll.live;
              roll.counting = false; // locked until speed drops below the low threshold
            }
          }
        }

        // Auto-reset: off the throttle for AUTO_RESET_S sim-seconds clears the
        // run, so you can just coast to a stop and re-stage without RESET.
        if (throttle < THROTTLE_OFF) {
          if (idleStart === null) {
            idleStart = now;
          } else if ((now - idleStart) >= AUTO_RESET_S && runHasData(run)) {
            scope.reset();
            return; // run object was replaced; nothing else to do this frame
          }
        } else {
          idleStart = null;
        }

        // Coming to a stop ends the previous run: results clear and the
        // timer re-stages itself, so every pull from 0 counts a fresh 0-60
        // with no manual RESET needed.
        if (speed < 0.5 && (run.active || run.done)) {
          scope.reset();
          run = scope.run;
        }

        // Arm: vehicle near-still — stage automatically, like a real Dragy.
        // No throttle requirement: any launch from standstill is timed.
        if (!run.armed && !run.active && !run.done && speed < 0.5) {
          run.armed   = true;
          run.armDist = odo;
          run.metric  = scope.metric; // lock the unit system for this run
        }

        // Launch: clock + distance start only after clearing the 1 ft rollout
        if (run.armed && !run.active && (odo - run.armDist) >= ROLLOUT_M) {
          run.active    = true;
          run.armed     = false;
          run.startTime = now;
          run.startDist = odo;       // distances measured from the rollout point
          run.startSpeed = speed;
        }

        // Status badge
        if (run.done)         scope.status = 'DONE';
        else if (run.active)  scope.status = 'RUN';
        else if (run.armed)   scope.status = 'STAGED';
        else                  scope.status = 'READY';

        if (!run.active) {
          if (!run.done) scope.liveDist = '0';
          return;
        }

        var elapsed = now - run.startTime;
        var dist    = odo - run.startDist;

        // Low speed interval (0-60 mph / 0-100 km/h), unit locked per run
        var runLowMps = run.metric ? 100 / MPS_TO_KMH : 60 / MPS_TO_MPH;
        if (!run.hitLow && speed >= runLowMps) {
          run.t060  = elapsed;
          run.hitLow = true;
        }

        // first split (1/8 mile, or 200 m in metric)
        if (!run.hitEighth && dist >= splitDistM(run)) {
          run.teighth   = elapsed;
          run.hitEighth = true;
        }

        // short distance (1/4 mile, or 400 m in metric)
        if (!run.hitQuarter && dist >= shortDistM(run)) {
          run.tquarter   = elapsed;
          run.hitQuarter = true;
        }

        // long distance (1/2 mile, or 1000 m in metric)
        if (!run.hitHalf && dist >= longDistM(run)) {
          run.thalf   = elapsed;
          run.hitHalf = true;
        }

        // Finish line — depends on the distance mode and the run's unit system
        if (!run.done && dist >= finishDistM(run)) {
          run.trapMps = speed;
          run.done    = true;
          run.active  = false; // run complete

          var key = scope.distMode + (run.metric ? 'M' : '');
          if (!scope.best[key] || elapsed < scope.best[key].time) {
            scope.best[key] = { time: elapsed, trapMps: speed };
          }
        }

        // Live distance while running (feet, or meters in metric mode)
        scope.liveDist = scope.metric ? dist.toFixed(0) : (dist * 3.28084).toFixed(0);
      });

      scope.$on('$destroy', function() {
        StreamsManager.remove(['electrics']);
      });
    }
  };
}]);
