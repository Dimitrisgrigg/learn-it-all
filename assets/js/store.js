/* ==========================================================================
   store.js — persistence + spaced repetition
   All state lives in localStorage under one key. No server, no account.
   Scheduling is a simplified SM-2: each rating adjusts an ease factor and
   sets the next interval, which is what drives the due queue.
   ========================================================================== */

(function () {
  "use strict";

  var KEY = "learn-it-all:v1";
  var DAY = 86400000;

  var DEFAULT_SETTINGS = {
    dailyGoal: 20,
    newPerDay: 8
  };

  var state = null;

  /* ---------------------------------------------------------------- utils */

  function uid(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function startOfDay(ts) {
    var d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function dayKey(ts) { return new Date(ts).toISOString().slice(0, 10); }

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function freshState() {
    var seed = window.LIA_SEED;
    var s = {
      version: seed.version,
      seededAt: Date.now(),
      courses: clone(seed.courses),
      lessons: clone(seed.lessons),
      cards: clone(seed.cards),
      reviews: clone(seed.reviews),
      settings: clone(DEFAULT_SETTINGS)
    };
    return s;
  }

  /* --------------------------------------------------------------- persist */

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { raw = null; }

    if (!raw) {
      state = freshState();
      save();
      return state;
    }
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.courses)) throw new Error("bad shape");
      state = parsed;
      if (!state.settings) state.settings = clone(DEFAULT_SETTINGS);
      if (!Array.isArray(state.reviews)) state.reviews = [];
    } catch (e) {
      state = freshState();
      save();
    }
    return state;
  }

  function save() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* Storage full or blocked (private mode). The app still works in memory. */
      console.warn("Learn It All: could not persist to localStorage.", e);
    }
  }

  function get() { return state || load(); }

  /* ---------------------------------------------------------------- reads */

  function courses() {
    return get().courses.slice().sort(function (a, b) { return a.createdAt - b.createdAt; });
  }

  function course(id) {
    return get().courses.find(function (c) { return c.id === id; }) || null;
  }

  function lessonsFor(courseId) {
    return get().lessons
      .filter(function (l) { return l.courseId === courseId; })
      .sort(function (a, b) { return a.position - b.position; });
  }

  function cardsFor(courseId) {
    return get().cards.filter(function (c) { return c.courseId === courseId; });
  }

  function card(id) {
    return get().cards.find(function (c) { return c.id === id; }) || null;
  }

  function dueCards(courseId) {
    var now = Date.now();
    return get().cards
      .filter(function (c) {
        if (courseId && c.courseId !== courseId) return false;
        return c.dueAt <= now;
      })
      .sort(function (a, b) { return a.dueAt - b.dueAt; });
  }

  function courseProgress(courseId) {
    var ls = lessonsFor(courseId);
    if (!ls.length) return { done: 0, total: 0, pct: 0 };
    var done = ls.filter(function (l) { return l.status === "done"; }).length;
    return { done: done, total: ls.length, pct: Math.round((done / ls.length) * 100) };
  }

  function reviewsToday() {
    var sod = startOfDay(Date.now());
    return get().reviews.filter(function (r) { return r.reviewedAt >= sod; });
  }

  function streak() {
    var rs = get().reviews;
    if (!rs.length) return 0;
    var days = {};
    rs.forEach(function (r) { days[dayKey(r.reviewedAt)] = true; });

    var count = 0;
    var cursor = startOfDay(Date.now());
    /* Today not yet studied should not break a streak built yesterday. */
    if (!days[dayKey(cursor)]) cursor -= DAY;

    while (days[dayKey(cursor)]) {
      count++;
      cursor -= DAY;
    }
    return count;
  }

  function reviewsLastDays(n) {
    var out = [];
    var today = startOfDay(Date.now());
    var rs = get().reviews;
    for (var i = n - 1; i >= 0; i--) {
      var day = today - i * DAY;
      var next = day + DAY;
      var c = rs.filter(function (r) { return r.reviewedAt >= day && r.reviewedAt < next; }).length;
      out.push({ ts: day, count: c, label: new Date(day).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2) });
    }
    return out;
  }

  function accuracy(days) {
    var rs = get().reviews;
    var since = days ? Date.now() - days * DAY : 0;
    var pool = rs.filter(function (r) { return r.reviewedAt >= since; });
    if (!pool.length) return null;
    var good = pool.filter(function (r) { return r.rating !== "again"; }).length;
    return Math.round((good / pool.length) * 100);
  }

  function totals() {
    var s = get();
    return {
      courses: s.courses.length,
      lessons: s.lessons.length,
      cards: s.cards.length,
      reviews: s.reviews.length,
      due: dueCards().length
    };
  }

  /* --------------------------------------------------------------- writes */

  function createCourse(data) {
    var c = {
      id: uid("c"),
      title: String(data.title || "").trim(),
      description: String(data.description || "").trim(),
      emoji: data.emoji || "◎",
      color: data.color || "#2f5d50",
      createdAt: Date.now()
    };
    if (!c.title) return null;
    get().courses.push(c);
    save();
    return c;
  }

  function updateCourse(id, patch) {
    var c = course(id);
    if (!c) return null;
    ["title", "description", "emoji", "color"].forEach(function (k) {
      if (patch[k] != null) c[k] = patch[k];
    });
    save();
    return c;
  }

  function deleteCourse(id) {
    var s = get();
    s.courses = s.courses.filter(function (c) { return c.id !== id; });
    var lessonIds = s.lessons.filter(function (l) { return l.courseId === id; }).map(function (l) { return l.id; });
    s.lessons = s.lessons.filter(function (l) { return l.courseId !== id; });
    var cardIds = s.cards.filter(function (c) { return c.courseId === id; }).map(function (c) { return c.id; });
    s.cards = s.cards.filter(function (c) { return c.courseId !== id; });
    s.reviews = s.reviews.filter(function (r) { return cardIds.indexOf(r.cardId) === -1 && lessonIds.indexOf(r.lessonId) === -1; });
    save();
  }

  function createLesson(courseId, data) {
    var ls = lessonsFor(courseId);
    var l = {
      id: uid("l"),
      courseId: courseId,
      title: String(data.title || "").trim(),
      body: String(data.body || "").trim(),
      status: data.status || "todo",
      position: ls.length,
      createdAt: Date.now()
    };
    if (!l.title) return null;
    get().lessons.push(l);
    save();
    return l;
  }

  function cycleLessonStatus(lessonId) {
    var order = ["todo", "in_progress", "done"];
    var l = get().lessons.find(function (x) { return x.id === lessonId; });
    if (!l) return;
    l.status = order[(order.indexOf(l.status) + 1) % order.length];
    save();
  }

  function deleteLesson(lessonId) {
    var s = get();
    s.lessons = s.lessons.filter(function (l) { return l.id !== lessonId; });
    s.cards.forEach(function (c) { if (c.lessonId === lessonId) c.lessonId = null; });
    save();
  }

  function createCard(courseId, data) {
    var c = {
      id: uid("k"),
      courseId: courseId,
      lessonId: data.lessonId || null,
      front: String(data.front || "").trim(),
      back: String(data.back || "").trim(),
      ease: 2.5,
      intervalDays: 0,
      reps: 0,
      lapses: 0,
      dueAt: Date.now(),
      createdAt: Date.now()
    };
    if (!c.front || !c.back) return null;
    get().cards.push(c);
    save();
    return c;
  }

  function deleteCard(cardId) {
    var s = get();
    s.cards = s.cards.filter(function (c) { return c.id !== cardId; });
    s.reviews = s.reviews.filter(function (r) { return r.cardId !== cardId; });
    save();
  }

  /* ---- SM-2 style scheduling -------------------------------------------
     again → lapse: ease down, interval resets to 10 minutes
     hard  → ease down slightly, interval grows a little
     good  → interval × ease
     easy  → interval × ease × 1.3
     Intervals are rounded to whole days once past the first day.
     -------------------------------------------------------------------- */

  var GRADE = {
    again: { label: "Again", delta: -0.20, mult: null, min: 10 / 1440 },
    hard:  { label: "Hard",  delta: -0.15, mult: 1.2,  min: 1 },
    good:  { label: "Good",  delta: 0,     mult: null, min: 1 },
    easy:  { label: "Easy",  delta: 0.15,  mult: 1.3,  min: 2 }
  };

  function previewInterval(cardObj, rating) {
    var g = GRADE[rating];
    if (!g) return "—";
    if (rating === "again") return "10m";

    var ease = Math.max(1.3, (cardObj.ease || 2.5) + g.delta);
    var base = cardObj.intervalDays > 0 ? cardObj.intervalDays : 0;

    var next;
    if (rating === "hard") {
      next = Math.max(g.min, base > 0 ? base * g.mult : 1);
    } else if (rating === "easy") {
      next = Math.max(g.min, base > 0 ? base * ease * g.mult : 3);
    } else {
      next = base > 0 ? base * ease : 1;
    }

    next = Math.round(next * 10) / 10;
    if (next < 1) return "<1d";
    if (next === 1) return "1d";
    if (next < 30) return Math.round(next) + "d";
    if (next < 365) return (Math.round(next / 30 * 10) / 10) + "mo";
    return (Math.round(next / 365 * 10) / 10) + "y";
  }

  function grade(cardId, rating) {
    var c = card(cardId);
    if (!c) return null;
    var g = GRADE[rating];
    if (!g) return null;

    var ease = Math.max(1.3, (c.ease || 2.5) + g.delta);
    var base = c.intervalDays || 0;
    var nextDays;

    if (rating === "again") {
      c.lapses = (c.lapses || 0) + 1;
      nextDays = 10 / 1440;            /* 10 minutes */
    } else if (rating === "hard") {
      nextDays = Math.max(g.min, base > 0 ? base * g.mult : 1);
    } else if (rating === "easy") {
      nextDays = Math.max(g.min, base > 0 ? base * ease * g.mult : 3);
    } else {
      nextDays = base > 0 ? base * ease : 1;
    }

    c.ease = Math.round(ease * 100) / 100;
    c.intervalDays = Math.round(nextDays * 100) / 100;
    c.reps = (c.reps || 0) + 1;
    c.dueAt = Date.now() + nextDays * DAY;

    get().reviews.push({
      id: uid("r"),
      cardId: c.id,
      rating: rating,
      reviewedAt: Date.now()
    });

    save();
    return c;
  }

  function updateSettings(patch) {
    Object.keys(patch).forEach(function (k) { get().settings[k] = patch[k]; });
    save();
  }

  function resetAll() {
    state = freshState();
    save();
    return state;
  }

  function wipe() {
    state = {
      version: 1,
      seededAt: Date.now(),
      courses: [],
      lessons: [],
      cards: [],
      reviews: [],
      settings: clone(DEFAULT_SETTINGS)
    };
    save();
    return state;
  }

  function exportJSON() {
    return JSON.stringify(get(), null, 2);
  }

  window.Store = {
    load: load,
    save: save,
    get: get,
    courses: courses,
    course: course,
    lessonsFor: lessonsFor,
    cardsFor: cardsFor,
    card: card,
    dueCards: dueCards,
    courseProgress: courseProgress,
    reviewsToday: reviewsToday,
    reviewsLastDays: reviewsLastDays,
    streak: streak,
    accuracy: accuracy,
    totals: totals,
    createCourse: createCourse,
    updateCourse: updateCourse,
    deleteCourse: deleteCourse,
    createLesson: createLesson,
    cycleLessonStatus: cycleLessonStatus,
    deleteLesson: deleteLesson,
    createCard: createCard,
    deleteCard: deleteCard,
    previewInterval: previewInterval,
    grade: grade,
    updateSettings: updateSettings,
    resetAll: resetAll,
    wipe: wipe,
    exportJSON: exportJSON,
    uid: uid,
    startOfDay: startOfDay
  };
})();
