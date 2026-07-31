/* Shared-course sync, deliberately kept ASCII-only to avoid encoding damage. */
(function () {
  var endpoint = 'https://firestore.googleapis.com/v1/projects/bacochu-585cd/databases/(default)/documents/courses';
  var apiKey = 'AIzaSyDjhg7tspyih6Esk0290zC8Boxm9PSDBnI';
  var ownKey = 'bacochu-my-course-ids';

  document.documentElement.dataset.sharedSync = 'loaded';

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (error) { return fallback; }
  }
  function ownIds() { return readJson(ownKey, []); }
  function setOwnIds(value) { localStorage.setItem(ownKey, JSON.stringify(value)); }
  function setStatus(message) {
    var status = document.getElementById('searchStatus');
    if (status) status.textContent = message;
  }
  function getCourse() {
    var stops = window.customStops;
    if (!Array.isArray(stops) || stops.length < 2) {
      setStatus('Please make a route with two or more places first.');
      return null;
    }
    var traits = Array.prototype.map.call(
      document.querySelectorAll('#registerTraitPanel .choice.active'),
      function (el) { return el.textContent; }
    );
    if (!traits.length) {
      setStatus('Please choose at least one travel preference.');
      return null;
    }
    var input = document.getElementById('courseNameInput');
    return {
      title: input && input.value.trim() ? input.value.trim() : 'My beach course',
      beach: window.selectedBeachName || '',
      meta: stops.map(function (stop) { return stop[0]; }).join(' / '),
      stops: stops,
      traits: traits,
      likes: 0,
      createdAt: Date.now()
    };
  }
  function renderRemote(remote) {
    try {
      communityCourses = remote;
      renderMyCourseBoard();
      renderCommunityBoard();
    } catch (error) {
      document.documentElement.dataset.sharedSync = 'render-error';
    }
  }
  async function loadShared() {
    try {
      var response = await fetch(endpoint + '?key=' + apiKey, { cache: 'no-store' });
      var data = await response.json();
      if (!response.ok) throw new Error('read');
      var remote = (data.documents || []).map(function (item) {
        try {
          var course = JSON.parse(item.fields.payload.stringValue);
          course.id = item.name.split('/').pop();
          return course;
        } catch (error) { return null; }
      }).filter(Boolean);
      document.documentElement.dataset.sharedSync = 'ready';
      renderRemote(remote);
      try {
        if (typeof courseMode !== 'undefined' && courseMode === 'apply' && typeof setupCourse === 'function') {
          setTimeout(function () { setupCourse(); }, 0);
        }
      } catch (error) {}
    } catch (error) {
      document.documentElement.dataset.sharedSync = 'read-failed';
    }
  }
  async function saveShared() {
    var course = getCourse();
    if (!course) return;
    setStatus('Saving to the shared board...');
    try {
      var response = await fetch(endpoint + '?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          payload: { stringValue: JSON.stringify(course) },
          createdAt: { integerValue: String(course.createdAt) }
        } })
      });
      var data = await response.json();
      if (!response.ok) throw new Error('write');
      course.id = data.name.split('/').pop();
      setOwnIds([course.id].concat(ownIds().filter(function (id) { return id !== course.id; })));
      setStatus('Saved to the shared board.');
      await loadShared();
      setTimeout(function () { location.reload(); }, 450);
    } catch (error) {
      document.documentElement.dataset.sharedSync = 'write-failed';
      setStatus('Shared save failed. Please try again.');
    }
  }
  async function deleteShared(id) {
    if (!id || !confirm('Delete this course?')) return;
    try {
      var response = await fetch(endpoint + '/' + id + '?key=' + apiKey, { method: 'DELETE' });
      if (!response.ok && response.status !== 404) throw new Error('delete');
      setOwnIds(ownIds().filter(function (value) { return value !== id; }));
      ['bacochu-my-courses', 'bacochu-local-registered-courses'].forEach(function (key) {
        var courses = readJson(key, []).filter(function (course) { return course.id !== id; });
        localStorage.setItem(key, JSON.stringify(courses));
      });
      location.reload();
    } catch (error) { alert('Delete failed.'); }
  }
  function bind() {
    var save = document.getElementById('saveCourseButton');
    if (save) save.onclick = function (event) {
      if (event) event.preventDefault();
      saveShared();
      return false;
    };
    window.saveRegisteredCourse = saveShared;
    window.deleteMyCourse = deleteShared;
    window.deleteCourseReliable = deleteShared;
    window.loadCommunityCourses = loadShared;
    if (!window.__sharedSaveCaptureInstalled) {
      window.__sharedSaveCaptureInstalled = true;
      window.addEventListener('click', function (event) {
        var target = event.target && event.target.closest ? event.target.closest('button') : null;
        if (target && target.id === 'saveCourseButton') {
          event.preventDefault();
          event.stopImmediatePropagation();
          saveShared();
        }
      }, true);
    }
    document.documentElement.dataset.sharedSync = 'bound';
    loadShared();
  }
  function normalize(value) { return String(value || '').replace(/\s+/g, '').toLowerCase(); }
  function beachCode(value) {
    var text = normalize(value);
    var aliases = [
      ['gwang', '\uad11\uc548\ub9ac'], ['song', '\uc1a1\uc815'], ['haeun', '\ud574\uc6b4\ub300'],
      ['dadae', '\ub2e4\ub300\ud3ec'], ['ilgw', '\uc77c\uad11'], ['imm', '\uc784\ub791']
    ];
    for (var i = 0; i < aliases.length; i += 1) {
      if (text.indexOf(normalize(aliases[i][1])) !== -1) return aliases[i][0];
    }
    return '';
  }
  function currentBeachCode() {
    var current = '';
    try { if (typeof selectedBeachName !== 'undefined') current = selectedBeachName; } catch (error) {}
    if (!current) current = window.selectedBeachName || '';
    if (!current) {
      var title = document.getElementById('courseTitle');
      var focus = document.getElementById('focusName');
      current = (title && title.textContent) || (focus && focus.textContent) || '';
    }
    return beachCode(current);
  }
  function belongsToCurrentBeach(course) {
    var selected = currentBeachCode();
    if (!selected) return false;
    var fields = [course && course.beach, course && course.title, course && course.meta];
    if (course && Array.isArray(course.stops)) {
      course.stops.forEach(function (stop) { fields.push(stop && stop[0]); });
    }
    return fields.some(function (field) { return beachCode(field) === selected; });
  }
  function isUsableCourse(course) {
    return !!(course && typeof course.title === 'string' && course.title.trim() &&
      typeof course.meta === 'string' && course.meta.trim() &&
      Array.isArray(course.stops) && course.stops.length >= 2);
  }
  function installBeachRecommendationFilter() {
    if (!window.setupCourse || window.__beachRecommendationFilterInstalled) return;
    var previousSetup = window.setupCourse;
    window.__beachRecommendationFilterInstalled = true;
    window.setupCourse = function () {
      if (typeof courseMode === 'undefined' || courseMode !== 'apply') return previousSetup();
      var cards = document.getElementById('routeCards');
      var preview = document.getElementById('routePreview');
      var traits = typeof selectedTraits === 'function' ? selectedTraits('applyTraits') : [];
      if (!traits.length) return previousSetup();
      var candidates = [];
      if (typeof routes !== 'undefined') {
        Object.keys(routes).forEach(function (id) {
          if (isUsableCourse(routes[id]) && belongsToCurrentBeach(routes[id])) candidates.push({ id: id, course: routes[id] });
        });
      }
      (communityCourses || []).forEach(function (course) {
        if (isUsableCourse(course) && belongsToCurrentBeach(course)) candidates.push({ id: course.id, course: course });
      });
      var score = function (course) {
        return (course.traits || []).filter(function (trait) { return traits.indexOf(trait) !== -1; }).length;
      };
      candidates.sort(function (a, b) { return score(b.course) - score(a.course); });
      activeCourses = {};
      candidates.forEach(function (entry) { activeCourses[entry.id] = entry.course; });
      cards.style.display = 'grid';
      cards.innerHTML = candidates.length ? candidates.map(function (entry, index) {
        var title = (index === 0 ? '\u0031\uc21c\uc704 \u00b7 ' : '') + entry.course.title;
        return '<div style="display:grid;gap:7px"><button class="route-card" data-route="' + entry.id + '" onclick="selectRoute(\'' + entry.id + '\')"><b>' + title + '</b><small>' + entry.course.meta + ' \u00b7 \uc131\ud5a5 \uc77c\uce58 ' + score(entry.course) + '\uac1c</small></button><button class="like" style="justify-self:start" onclick="window.showRecommendedDetail(\'' + entry.id + '\')">\ucf54\uc2a4 \uc790\uc138\ud788</button></div>';
      }).join('') : '<p style="margin:0;color:#738098">\uc774 \ud574\uc218\uc695\uc7a5\uc5d0 \ub4f1\ub85d\ub41c \ucf54\uc2a4\uac00 \uc544\uc9c1 \uc5c6\uc5b4\uc694.</p>';
      if (candidates.length) {
        currentRouteId = candidates[0].id;
        selectRoute(currentRouteId);
      } else if (preview) {
        preview.innerHTML = '<b>\uc77c\uce58\ud558\ub294 \ucf54\uc2a4\uac00 \uc544\uc9c1 \uc5c6\uc5b4\uc694.</b><p style="color:#738098;font-size:14px">\uc774 \ud574\uc218\uc695\uc7a5\uc758 \uccab \ubc88\uc9f8 \ucf54\uc2a4\ub97c \ub4f1\ub85d\ud574 \ubcf4\uc138\uc694.</p>';
      }
    };
  }
  window.addEventListener('load', function () { setTimeout(bind, 300); });
  setTimeout(function () { bind(); installBeachRecommendationFilter(); }, 1200);
}());
