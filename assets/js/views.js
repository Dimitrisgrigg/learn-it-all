/* ==========================================================================
   views.js — every screen, rendered as an HTML string.
   Views are pure: they read Store and return markup. Behaviour is wired in
   app.js via data-action attributes, so no inline handlers are needed.
   ========================================================================== */

(function () {
  "use strict";

  var EMOJIS = ["◎", "◈", "◔", "▲", "✦", "❖", "▣", "◍", "◆", "⬢", "✳", "❋"];
  var COLORS = ["#2f5d50", "#b4674a", "#c08a2e", "#4a5f80", "#7a5c78", "#3f6b5f"];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }

  function relDay(ts) {
    var today = Store.startOfDay(Date.now());
    var d = Store.startOfDay(ts);
    var diff = Math.round((d - today) / 86400000);
    if (diff === 0) return "today";
    if (diff === 1) return "tomorrow";
    if (diff === -1) return "yesterday";
    if (diff < 0) return Math.abs(diff) + " days ago";
    return "in " + plural(diff, "day");
  }

  function statusLabel(s) {
    return s === "in_progress" ? "In progress" : s === "done" ? "Done" : "To do";
  }

  function statusChip(s) {
    var cls = s === "done" ? "chip-pine" : s === "in_progress" ? "chip-gold" : "";
    return '<span class="chip ' + cls + '">' + statusLabel(s) + "</span>";
  }

  /* ------------------------------------------------------------ dashboard */

  function dashboard() {
    var courses = Store.courses();
    var due = Store.dueCards();
    var goal = Store.get().settings.dailyGoal || 20;
    var doneToday = Store.reviewsToday().length;
    var s = Store.streak();
    var acc = Store.accuracy(30);
    var todayPct = Math.min(100, Math.round((doneToday / goal) * 100));

    var head =
      '<div class="page-head">' +
        '<span class="eyebrow">Today</span>' +
        '<h1 class="page-title">Good to see you back.</h1>' +
        '<p class="page-sub">' +
          (due.length
            ? plural(due.length, "card") + " are ready for review. Ten focused minutes clears most of a queue this size."
            : "Nothing is due right now. Add cards to a course, or come back tomorrow when reviews mature.") +
        "</p>" +
      "</div>";

    var hero =
      '<section class="hero">' +
        "<div>" +
          '<span class="eyebrow">Study queue</span>' +
          "<h1>" + (due.length ? due.length + " cards due" : "Queue clear") + "</h1>" +
          "<p>" +
            (due.length
              ? "Reviews are ordered by how overdue they are. Getting them wrong is not a failure — it is the schedule doing its job."
              : "Your next reviews arrive as intervals mature. Meanwhile, a new card takes a minute to write and saves you far more.") +
          "</p>" +
          '<div class="hero-actions">' +
            '<a class="btn btn-primary" href="#/study">' + (due.length ? "Start studying" : "Open study") + "</a>" +
            '<a class="btn btn-ghost" href="#/courses">Browse courses</a>' +
          "</div>" +
        "</div>" +
        '<div class="streak">' +
          '<div class="streak-num">' + s + "</div>" +
          '<div class="streak-label">' + plural(s, "day") + " streak</div>" +
        "</div>" +
      "</section>";

    var stats =
      '<div class="stat-grid" style="margin-top:var(--sp-5)">' +
        '<div class="stat is-accent">' +
          '<div class="stat-label">Reviewed today</div>' +
          '<div class="stat-value">' + doneToday + "</div>" +
          '<div class="stat-note">goal ' + goal + " · " + todayPct + "% there</div>" +
        "</div>" +
        '<div class="stat">' +
          '<div class="stat-label">Due now</div>' +
          '<div class="stat-value">' + due.length + "</div>" +
          '<div class="stat-note">across ' + plural(courses.length, "course") + "</div>" +
        "</div>" +
        '<div class="stat">' +
          '<div class="stat-label">Recall, 30 days</div>' +
          '<div class="stat-value">' + (acc == null ? "—" : acc + "%") + "</div>" +
          '<div class="stat-note">' + (acc == null ? "no reviews yet" : "not counted as lapses") + "</div>" +
        "</div>" +
        '<div class="stat">' +
          '<div class="stat-label">Lessons complete</div>' +
          '<div class="stat-value">' + completeLessons() + "</div>" +
          '<div class="stat-note">of ' + plural(Store.get().lessons.length, "lesson") + "</div>" +
        "</div>" +
      "</div>";

    var coursePanel;
    if (!courses.length) {
      coursePanel =
        '<div class="empty">' +
          '<div class="empty-mark">▤</div>' +
          '<div class="empty-title">No courses yet</div>' +
          '<p class="empty-text">A course is a subject you are working through. Create one, add a few lessons, then write the flashcards that test them.</p>' +
          '<button class="btn btn-primary" type="button" data-action="new-course">Create your first course</button>' +
        "</div>";
    } else {
      coursePanel =
        '<div class="course-grid">' + courses.slice(0, 6).map(courseCard).join("") + "</div>";
    }

    var queuePanel;
    if (due.length) {
      queuePanel =
        '<div class="panel panel-flush"><ul class="list">' +
        due.slice(0, 6).map(function (c) {
          var co = Store.course(c.courseId);
          return (
            '<li class="list-item">' +
              '<span class="dot in_progress"></span>' +
              '<div class="li-main">' +
                '<div class="li-title">' + esc(truncate(c.front, 74)) + "</div>" +
                '<div class="li-sub">' + esc(co ? co.title : "Unsorted") + " · " + relDay(c.dueAt) + "</div>" +
              "</div>" +
            "</li>"
          );
        }).join("") +
        "</ul></div>" +
        (due.length > 6 ? '<p class="caption" style="margin-top:var(--sp-3)">and ' + (due.length - 6) + " more in the queue</p>" : "");
    } else {
      queuePanel =
        '<div class="empty">' +
          '<div class="empty-mark">◈</div>' +
          '<div class="empty-title">Queue is empty</div>' +
          '<p class="empty-text">Nothing is due. Intervals grow as you answer correctly, so an empty queue is the schedule working, not a bug.</p>' +
          '<button class="btn btn-ghost" type="button" data-action="study-anyway">Study ahead anyway</button>' +
        "</div>";
    }

    var weekPanel =
      '<div class="panel">' +
        '<div class="section-title" style="font-size:var(--fs-md)">Last 14 days</div>' +
        '<p class="caption" style="margin-top:4px">Reviews per day</p>' +
        bars14() +
      "</div>";

    return (
      head + hero + stats +
      '<div class="section-head"><h2 class="section-title">Your courses</h2>' +
        '<a class="section-link" href="#/courses">View all</a></div>' +
      coursePanel +
      '<div class="split" style="margin-top:var(--sp-7)">' +
        '<div><div class="section-head"><h2 class="section-title">Up next</h2>' +
          '<a class="section-link" href="#/study">Study</a></div>' + queuePanel + "</div>" +
        weekPanel +
      "</div>"
    );
  }

  function completeLessons() {
    return Store.get().lessons.filter(function (l) { return l.status === "done"; }).length;
  }

  function truncate(s, n) {
    s = String(s || "");
    return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
  }

  function bars14() {
    var data = Store.reviewsLastDays(14);
    var max = Math.max.apply(null, data.map(function (d) { return d.count; }).concat([1]));
    var todayIdx = data.length - 1;
    return (
      '<div class="bars">' +
      data.map(function (d, i) {
        var h = Math.max(3, Math.round((d.count / max) * 100));
        return (
          '<div class="bar-col' + (i === todayIdx ? " is-today" : "") + '" title="' + d.count + ' reviews">' +
            '<span style="height:' + h + '%"></span>' +
            "<small>" + (i % 2 === 0 || i === todayIdx ? esc(d.label) : "&nbsp;") + "</small>" +
          "</div>"
        );
      }).join("") +
      "</div>"
    );
  }

  /* --------------------------------------------------------------- courses */

  function courseCard(c) {
    var p = Store.courseProgress(c.id);
    var cards = Store.cardsFor(c.id);
    var due = cards.filter(function (k) { return k.dueAt <= Date.now(); }).length;

    return (
      '<a class="course-card" href="#/course/' + esc(c.id) + '" style="--card-color:' + esc(c.color) + '">' +
        '<div class="course-top">' +
          '<span class="course-emoji" aria-hidden="true">' + esc(c.emoji) + "</span>" +
          '<div><div class="course-name">' + esc(c.title) + "</div>" +
            '<div class="caption" style="margin-top:2px">' + plural(p.total, "lesson") + " · " + plural(cards.length, "card") + "</div>" +
          "</div>" +
        "</div>" +
        (c.description ? '<p class="course-desc">' + esc(c.description) + "</p>" : "") +
        '<div class="progress-row"><span>Progress</span><span>' + p.done + " / " + p.total + "</span></div>" +
        '<div class="progress"><span style="width:' + p.pct + '%"></span></div>' +
        '<div class="course-meta">' +
          (due ? "<span><strong>" + due + "</strong> due now</span>" : "<span>nothing due</span>") +
          "<span>" + p.pct + "% complete</span>" +
        "</div>" +
      "</a>"
    );
  }

  function courses() {
    var list = Store.courses();
    var head =
      '<div class="page-head">' +
        '<span class="eyebrow">Library</span>' +
        '<h1 class="page-title">Courses</h1>' +
        '<p class="page-sub">Every subject you are working through, with the lessons inside it and the cards that test them.</p>' +
      "</div>";

    if (!list.length) {
      return head +
        '<div class="empty">' +
          '<div class="empty-mark">▤</div>' +
          '<div class="empty-title">Your library is empty</div>' +
          '<p class="empty-text">Start with the one thing you are actually trying to learn this month. One course, three lessons, ten cards — that is enough to build the habit.</p>' +
          '<button class="btn btn-primary" type="button" data-action="new-course">Create a course</button>' +
        "</div>";
    }

    return (
      head +
      '<div class="section-head"><h2 class="section-title">' + plural(list.length, "course") + "</h2>" +
        '<button class="btn btn-ghost btn-sm" type="button" data-action="new-course">+ New course</button></div>' +
      '<div class="course-grid">' + list.map(courseCard).join("") + "</div>"
    );
  }

  /* ---------------------------------------------------------- course detail */

  function courseDetail(courseId) {
    var c = Store.course(courseId);
    if (!c) return notFound("That course does not exist.");

    var lessons = Store.lessonsFor(courseId);
    var cards = Store.cardsFor(courseId);
    var p = Store.courseProgress(courseId);
    var due = cards.filter(function (k) { return k.dueAt <= Date.now(); }).length;

    var head =
      '<div class="page-head">' +
        '<a class="section-link" href="#/courses">← All courses</a>' +
        '<div style="display:flex;align-items:flex-start;gap:var(--sp-4);margin-top:var(--sp-3)">' +
          '<span class="course-emoji" style="width:52px;height:52px;flex:0 0 52px;font-size:1.5rem">' + esc(c.emoji) + "</span>" +
          '<div style="flex:1 1 auto;min-width:0">' +
            '<h1 class="page-title" style="font-size:var(--fs-xl)">' + esc(c.title) + "</h1>" +
            (c.description ? '<p class="page-sub" style="margin-top:6px">' + esc(c.description) + "</p>" : "") +
          "</div>" +
        "</div>" +
      "</div>";

    var actionBar =
      '<div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-5)">' +
        '<a class="btn btn-primary" href="#/study/' + esc(c.id) + '">' + (due ? "Study " + due + " due" : "Study this course") + "</a>" +
        '<button class="btn btn-ghost" type="button" data-action="new-lesson" data-course="' + esc(c.id) + '">+ Lesson</button>' +
        '<button class="btn btn-ghost" type="button" data-action="new-card" data-course="' + esc(c.id) + '">+ Card</button>' +
        '<button class="btn btn-danger" type="button" data-action="delete-course" data-course="' + esc(c.id) + '" style="margin-left:auto">Delete</button>' +
      "</div>";

    var overview =
      '<div class="stat-grid" style="margin-bottom:var(--sp-6)">' +
        '<div class="stat"><div class="stat-label">Lessons done</div><div class="stat-value">' + p.done + " / " + p.total + '</div><div class="stat-note">' + p.pct + "% of the course</div></div>" +
        '<div class="stat"><div class="stat-label">Cards</div><div class="stat-value">' + cards.length + '</div><div class="stat-note">' + plural(due, "card") + " due now</div></div>" +
        '<div class="stat"><div class="stat-label">Average ease</div><div class="stat-value">' + avgEase(cards) + '</div><div class="stat-note">2.5 is the starting point</div></div>' +
      "</div>";

    var lessonPanel;
    if (!lessons.length) {
      lessonPanel =
        '<div class="empty">' +
          '<div class="empty-mark">▤</div>' +
          '<div class="empty-title">No lessons yet</div>' +
          '<p class="empty-text">A lesson is one idea you can state in a paragraph. Keep them small — a lesson that needs six cards probably wants to be two lessons.</p>' +
          '<button class="btn btn-primary" type="button" data-action="new-lesson" data-course="' + esc(c.id) + '">Add a lesson</button>' +
        "</div>";
    } else {
      lessonPanel =
        '<div class="panel panel-flush"><ul class="list">' +
        lessons.map(function (l) {
          var lc = cards.filter(function (k) { return k.lessonId === l.id; }).length;
          return (
            '<li class="list-item">' +
              '<button class="btn btn-quiet" type="button" data-action="cycle-lesson" data-lesson="' + esc(l.id) + '" ' +
                'title="Change status" aria-label="Change status of ' + esc(l.title) + '" style="padding:4px 6px">' +
                '<span class="dot ' + esc(l.status) + '"></span>' +
              "</button>" +
              '<div class="li-main">' +
                '<div class="li-title' + (l.status === "done" ? " is-done" : "") + '">' + esc(l.title) + "</div>" +
                '<div class="li-sub">' + plural(lc, "card") + " · " + statusLabel(l.status) + "</div>" +
              "</div>" +
              statusChip(l.status) +
              '<button class="btn btn-quiet" type="button" data-action="delete-lesson" data-lesson="' + esc(l.id) + '" aria-label="Delete lesson">✕</button>' +
            "</li>"
          );
        }).join("") +
        "</ul></div>";
    }

    var cardPanel;
    if (!cards.length) {
      cardPanel =
        '<div class="empty">' +
          '<div class="empty-mark">◈</div>' +
          '<div class="empty-title">No cards yet</div>' +
          '<p class="empty-text">Good cards ask one thing. If the front has the word “and” in it, it is probably two cards.</p>' +
          '<button class="btn btn-primary" type="button" data-action="new-card" data-course="' + esc(c.id) + '">Write a card</button>' +
        "</div>";
    } else {
      cardPanel =
        '<div class="panel panel-flush"><ul class="list">' +
        cards.map(function (k) {
          var isDue = k.dueAt <= Date.now();
          return (
            '<li class="list-item">' +
              '<span class="dot ' + (isDue ? "in_progress" : "done") + '"></span>' +
              '<div class="li-main">' +
                '<div class="li-title">' + esc(truncate(k.front, 88)) + "</div>" +
                '<div class="li-sub">' + (isDue ? "Due now" : "Next " + relDay(k.dueAt)) +
                  " · ease " + (k.ease || 2.5).toFixed(2) +
                  " · " + plural(k.reps || 0, "review") +
                "</div>" +
              "</div>" +
              '<button class="btn btn-quiet" type="button" data-action="delete-card" data-card="' + esc(k.id) + '" aria-label="Delete card">✕</button>' +
            "</li>"
          );
        }).join("") +
        "</ul></div>";
    }

    return (
      head + actionBar + overview +
      '<div class="section-head"><h2 class="section-title">Lessons</h2>' +
        (lessons.length ? '<button class="btn btn-quiet btn-sm" type="button" data-action="new-lesson" data-course="' + esc(c.id) + '">+ Add</button>' : "") +
      "</div>" + lessonPanel +
      '<div class="section-head"><h2 class="section-title">Cards</h2>' +
        (cards.length ? '<button class="btn btn-quiet btn-sm" type="button" data-action="new-card" data-course="' + esc(c.id) + '">+ Add</button>' : "") +
      "</div>" + cardPanel
    );
  }

  function avgEase(cards) {
    if (!cards.length) return "—";
    var sum = cards.reduce(function (a, c) { return a + (c.ease || 2.5); }, 0);
    return (sum / cards.length).toFixed(2);
  }

  /* ---------------------------------------------------------------- study */

  function study(courseId) {
    var co = courseId ? Store.course(courseId) : null;
    var due = Store.dueCards(courseId || null);

    var head =
      '<div class="page-head">' +
        '<span class="eyebrow">Review</span>' +
        '<h1 class="page-title">' + (co ? esc(co.title) : "Study") + "</h1>" +
        '<p class="page-sub">' +
          (due.length
            ? plural(due.length, "card") + " ready. Answer from memory first — the effort of recall is what makes it stick."
            : "Nothing is due. You can still pull cards forward if you want to drill before they mature.") +
        "</p>" +
      "</div>";

    var session =
      '<div class="study-wrap">' +
        '<div class="study-top">' +
          '<span class="caption" id="study-counter">0 / ' + due.length + "</span>" +
          '<div class="study-progress"><span id="study-bar" style="width:0%"></span></div>' +
          '<button class="btn btn-quiet btn-sm" type="button" data-action="end-session">End</button>' +
        "</div>" +
        '<div id="study-stage"></div>' +
      "</div>";

    return head + session;
  }

  function studyEmpty() {
    return (
      '<div class="empty" style="margin-top:var(--sp-4)">' +
        '<div class="empty-mark">✓</div>' +
        '<div class="empty-title">Queue cleared</div>' +
        '<p class="empty-text">You have answered everything that was due. Intervals have been rescheduled — some cards will not surface again for weeks.</p>' +
        '<div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;justify-content:center">' +
          '<a class="btn btn-primary" href="#/dashboard">Back to dashboard</a>' +
          '<button class="btn btn-ghost" type="button" data-action="study-anyway">Drill ahead</button>' +
        "</div>" +
      "</div>"
    );
  }

  /* ---------------------------------------------------------------- stats */

  function stats() {
    var s = Store.get();
    var acc = Store.accuracy(30);
    var acc7 = Store.accuracy(7);
    var total = s.reviews.length;

    var head =
      '<div class="page-head">' +
        '<span class="eyebrow">Progress</span>' +
        '<h1 class="page-title">How the studying is going</h1>' +
        '<p class="page-sub">Volume tells you whether you showed up. Recall tells you whether it is working. Neither is useful alone.</p>' +
      "</div>";

    var stats =
      '<div class="stat-grid">' +
        '<div class="stat is-accent"><div class="stat-label">Current streak</div><div class="stat-value">' + Store.streak() + '</div><div class="stat-note">consecutive days</div></div>' +
        '<div class="stat"><div class="stat-label">Total reviews</div><div class="stat-value">' + total + '</div><div class="stat-note">since you started</div></div>' +
        '<div class="stat"><div class="stat-label">Recall, 30d</div><div class="stat-value">' + (acc == null ? "—" : acc + "%") + '</div><div class="stat-note">' + (acc7 == null ? "no recent data" : acc7 + "% in the last 7") + "</div></div>" +
        '<div class="stat"><div class="stat-label">Cards in rotation</div><div class="stat-value">' + s.cards.length + '</div><div class="stat-note">' + plural(Store.dueCards().length, "card") + " due now</div></div>" +
      "</div>";

    var volume =
      '<div class="panel" style="margin-top:var(--sp-5)">' +
        '<div class="section-title" style="font-size:var(--fs-md)">Review volume</div>' +
        '<p class="caption" style="margin-top:4px">Per day, last 14 days</p>' +
        bars14() +
      "</div>";

    /* per-course table */
    var courses = Store.courses();
    var byCourse;
    if (!courses.length) {
      byCourse =
        '<div class="empty">' +
          '<div class="empty-mark">▤</div>' +
          '<div class="empty-title">Nothing to break down yet</div>' +
          '<p class="empty-text">Once you have a course with reviews, this panel shows which subject is holding up and which one keeps slipping.</p>' +
          '<button class="btn btn-primary" type="button" data-action="new-course">Create a course</button>' +
        "</div>";
    } else {
      byCourse =
        '<div class="panel panel-flush"><ul class="list">' +
        courses.map(function (c) {
          var cards = Store.cardsFor(c.id);
          var p = Store.courseProgress(c.id);
          var ids = cards.map(function (k) { return k.id; });
          var rs = s.reviews.filter(function (r) { return ids.indexOf(r.cardId) !== -1; });
          var ok = rs.filter(function (r) { return r.rating !== "again"; }).length;
          var rate = rs.length ? Math.round((ok / rs.length) * 100) : null;
          return (
            '<li class="list-item">' +
              '<span class="course-emoji" style="width:28px;height:28px;flex:0 0 28px;font-size:.85rem;background:' + esc(c.color) + '22">' + esc(c.emoji) + "</span>" +
              '<div class="li-main">' +
                '<div class="li-title">' + esc(c.title) + "</div>" +
                '<div class="li-sub">' + plural(cards.length, "card") + " · " + p.pct + "% lessons done · " + plural(rs.length, "review") + "</div>" +
              "</div>" +
              '<span class="chip ' + (rate == null ? "" : rate >= 85 ? "chip-pine" : rate >= 70 ? "chip-gold" : "chip-clay") + '">' +
                (rate == null ? "no data" : rate + "% recall") +
              "</span>" +
            "</li>"
          );
        }).join("") +
        "</ul></div>";
    }

    /* rating split */
    var split = { again: 0, hard: 0, good: 0, easy: 0 };
    s.reviews.forEach(function (r) { if (split[r.rating] != null) split[r.rating]++; });
    var ratingPanel =
      '<div class="panel">' +
        '<div class="section-title" style="font-size:var(--fs-md)">Answer mix</div>' +
        '<p class="caption" style="margin-top:4px">How you rate cards across all reviews</p>' +
        '<dl style="margin:var(--sp-4) 0 0">' +
          ["again", "hard", "good", "easy"].map(function (k) {
            var n = split[k];
            var pct = total ? Math.round((n / total) * 100) : 0;
            return '<div class="kv"><dt style="text-transform:capitalize">' + k + "</dt><dd>" + n + " · " + pct + "%</dd></div>";
          }).join("") +
        "</dl>" +
        '<p class="caption" style="margin-top:var(--sp-4)">A healthy mix leans on “good”. If “again” climbs past a fifth of answers, the intervals are too long or the cards are too broad.</p>' +
      "</div>";

    var best = s.cards.slice().sort(function (a, b) { return (b.intervalDays || 0) - (a.intervalDays || 0); }).slice(0, 5);
    var bestPanel =
      '<div class="panel">' +
        '<div class="section-title" style="font-size:var(--fs-md)">Longest intervals</div>' +
        '<p class="caption" style="margin-top:4px">The cards you have kept alive the longest</p>' +
        (best.length
          ? '<dl style="margin:var(--sp-4) 0 0">' + best.map(function (c) {
              return '<div class="kv"><dt style="max-width:62%">' + esc(truncate(c.front, 52)) + "</dt><dd>" + (c.intervalDays < 1 ? "<1d" : Math.round(c.intervalDays) + "d") + "</dd></div>";
            }).join("") + "</dl>"
          : '<p class="caption" style="margin-top:var(--sp-4)">No cards yet.</p>') +
      "</div>";

    return (
      head + stats + volume +
      '<div class="section-head"><h2 class="section-title">By course</h2></div>' + byCourse +
      '<div class="split" style="margin-top:var(--sp-5)">' + ratingPanel + bestPanel + "</div>"
    );
  }

  /* ------------------------------------------------------------- settings */

  function settings() {
    var st = Store.get().settings;
    var t = Store.totals();

    var head =
      '<div class="page-head">' +
        '<span class="eyebrow">Settings</span>' +
        '<h1 class="page-title">Your workspace</h1>' +
        '<p class="page-sub">Everything here is stored in this browser only. There is no account and no server, which is also why there is no way to recover data you delete.</p>' +
      "</div>";

    var goalPanel =
      '<div class="panel">' +
        '<div class="section-title" style="font-size:var(--fs-md)">Daily goal</div>' +
        '<p class="caption" style="margin-top:4px">The number of reviews you aim to clear each day. It only drives the progress bar.</p>' +
        '<div class="field" style="margin-top:var(--sp-4);max-width:220px">' +
          '<label for="set-goal">Reviews per day</label>' +
          '<input class="input" id="set-goal" type="number" min="5" max="200" step="5" value="' + esc(st.dailyGoal) + '">' +
        "</div>" +
        '<button class="btn btn-primary btn-sm" type="button" data-action="save-goal">Save goal</button>' +
      "</div>";

    var dataPanel =
      '<div class="panel" style="margin-top:var(--sp-5)">' +
        '<div class="section-title" style="font-size:var(--fs-md)">Data</div>' +
        '<dl style="margin:var(--sp-4) 0">' +
          '<div class="kv"><dt>Courses</dt><dd>' + t.courses + "</dd></div>" +
          '<div class="kv"><dt>Lessons</dt><dd>' + t.lessons + "</dd></div>" +
          '<div class="kv"><dt>Cards</dt><dd>' + t.cards + "</dd></div>" +
          '<div class="kv"><dt>Reviews logged</dt><dd>' + t.reviews + "</dd></div>" +
        "</dl>" +
        '<div style="display:flex;gap:var(--sp-2);flex-wrap:wrap">' +
          '<button class="btn btn-ghost btn-sm" type="button" data-action="export">Export JSON</button>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-action="restore-seed">Restore sample content</button>' +
          '<button class="btn btn-danger btn-sm" type="button" data-action="wipe">Erase everything</button>' +
        "</div>" +
      "</div>";

    return head +
      '<div class="split">' +
        "<div>" + goalPanel + dataPanel + "</div>" +
        '<div class="panel">' +
          '<div class="section-title" style="font-size:var(--fs-md)">What this build is</div>' +
          '<ul class="about-list">' +
            "<li>A single-page app: plain HTML, CSS and JavaScript, no build step and no dependencies.</li>" +
            "<li>State persists through <code>localStorage</code> under the key <code>learn-it-all:v1</code>.</li>" +
            "<li>Scheduling is a simplified SM-2: four grades adjust an ease factor and set the next interval.</li>" +
            "<li>Nothing leaves the browser — there are no network requests after the page loads.</li>" +
          "</ul>" +
        "</div>" +
      "</div>";
  }

  function about() {
    return (
      '<div class="page-head">' +
        '<span class="eyebrow">About</span>' +
        '<h1 class="page-title">Learn It All</h1>' +
        '<p class="page-sub">A study workspace built as a static site — the whole application is three JavaScript files and one stylesheet, served from a branch with no build step.</p>' +
      "</div>" +
      '<div class="split">' +
        '<div class="panel">' +
          '<div class="section-title" style="font-size:var(--fs-md)">Screens</div>' +
          '<ul class="about-list">' +
            "<li><strong>Dashboard</strong> — streak, cards due, today's goal and a 14-day review chart.</li>" +
            "<li><strong>Courses</strong> — a card per subject with completion and due counts.</li>" +
            "<li><strong>Course detail</strong> — lessons you can tick through, plus the cards attached to them.</li>" +
            "<li><strong>Study</strong> — a flashcard session with four grades and a live interval preview.</li>" +
            "<li><strong>Progress</strong> — recall rate, answer mix and a per-course breakdown.</li>" +
            "<li><strong>Settings</strong> — daily goal, export and reset.</li>" +
          "</ul>" +
        "</div>" +
        '<div class="panel">' +
          '<div class="section-title" style="font-size:var(--fs-md)">How scheduling works</div>' +
          '<p class="caption" style="margin-top:8px">Each card carries an ease factor (starting at 2.5) and a current interval. “Again” drops the ease and resets the interval to ten minutes; “Hard” grows it cautiously; “Good” multiplies by the ease; “Easy” multiplies by the ease and adds thirty percent. Correct answers push a card further out, which is why the queue shrinks without you losing anything.</p>' +
        "</div>" +
      "</div>"
    );
  }

  function notFound(msg) {
    return (
      '<div class="empty" style="margin-top:var(--sp-6)">' +
        '<div class="empty-mark">?</div>' +
        '<div class="empty-title">Nothing here</div>' +
        '<p class="empty-text">' + esc(msg || "That page does not exist.") + "</p>" +
        '<a class="btn btn-primary" href="#/dashboard">Back to dashboard</a>' +
      "</div>"
    );
  }

  window.Views = {
    dashboard: dashboard,
    courses: courses,
    courseDetail: courseDetail,
    study: study,
    studyEmpty: studyEmpty,
    stats: stats,
    settings: settings,
    about: about,
    notFound: notFound,
    esc: esc,
    truncate: truncate,
    EMOJIS: EMOJIS,
    COLORS: COLORS
  };
})();
