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
    document.documentElement.dataset.sharedSync = 'bound';
    loadShared();
  }
  window.addEventListener('load', function () { setTimeout(bind, 300); });
  setTimeout(bind, 1200);
}());
