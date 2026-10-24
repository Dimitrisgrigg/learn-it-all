/* ==========================================================================
   app.js — hash router, modal system, session engine and event wiring.
   All interaction is delegated from one listener on document, so markup
   rendered by Views needs no inline handlers and no re-binding.
   ========================================================================== */

(function () {
  "use strict";

  var viewEl, titleEl, modalRoot, scrim, sidebar, toasts;

  /* ----------------------------------------------------------- utilities */

  function $(sel, root) { return (root || document).querySelector(sel); }

  function toast(msg, kind) {
    var el = document.createElement("div");
    el.className = "toast" + (kind ? " toast-" + kind : "");
    el.textContent = msg;
    toasts.appendChild(el);
    window.setTimeout(function () {
      el.style.transition = "opacity 200ms ease, transform 200ms ease";
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      window.setTimeout(function () { el.remove(); }, 220);
    }, 2400);
  }

  /* --------------------------------------------------------------- modals */

  var modalState = { open: false, onClose: null };

  function openModal(html, onMount) {
    modalRoot.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' + html + "</div>";
    modalRoot.hidden = false;
    modalState.open = true;
    var focusable = modalRoot.querySelector("input, textarea, select, button");
    if (focusable) focusable.focus();
    if (typeof onMount === "function") onMount(modalRoot);

    modalRoot.onclick = function (e) {
      if (e.target === modalRoot) closeModal();
    };
  }

  function closeModal() {
    modalRoot.hidden = true;
    modalRoot.innerHTML = "";
    modalState.open = false;
  }

  function modalShell(title, bodyHtml, footHtml) {
    return (
      '<div class="modal-head">' +
        '<div class="modal-title">' + Views.esc(title) + "</div>" +
        '<button class="modal-close" type="button" data-action="close-modal" aria-label="Close">✕</button>' +
      "</div>" +
      bodyHtml +
      '<div class="modal-foot">' + footHtml + "</div>"
    );
  }

  /* ---------------------------------------------------------- course modal */

  function newCourseModal() {
    var emojis = Views.EMOJIS.map(function (e, i) {
      return '<button class="emoji-opt' + (i === 0 ? " is-on" : "") + '" type="button" data-emoji="' + e + '">' + e + "</button>";
    }).join("");

    var colors = Views.COLORS.map(function (c, i) {
      return '<button type="button" data-color="' + c + '" style="width:26px;height:26px;border-radius:50%;border:2px solid ' +
        (i === 0 ? "var(--ink)" : "transparent") + ";background:" + c + ';cursor:pointer" aria-label="Colour ' + (i + 1) + '"></button>';
    }).join("");

    var body =
      '<form id="course-form" novalidate>' +
        '<div class="field">' +
          '<label for="cf-title">Course name</label>' +
          '<input class="input" id="cf-title" name="title" placeholder="e.g. Statistics for product work" maxlength="70" required>' +
        "</div>" +
        '<div class="field">' +
          '<label for="cf-desc">What it covers</label>' +
          '<textarea class="textarea" id="cf-desc" name="description" placeholder="One or two sentences. This is for you, not for a syllabus." maxlength="220"></textarea>' +
        "</div>" +
        '<div class="field">' +
          '<label>Icon</label>' +
          '<div class="emoji-picker">' + emojis + "</div>" +
          '<input type="hidden" name="emoji" value="' + Views.EMOJIS[0] + '">' +
        "</div>" +
        '<div class="field">' +
          '<label>Colour</label>' +
          '<div style="display:flex;gap:8px;align-items:center">' + colors + "</div>" +
          '<input type="hidden" name="color" value="' + Views.COLORS[0] + '">' +
        "</div>" +
      "</form>";

    var foot =
      '<button class="btn btn-ghost" type="button" data-action="close-modal">Cancel</button>' +
      '<button class="btn btn-primary" type="button" data-action="save-course">Create course</button>';

    openModal(modalShell("New course", body, foot), function (root) {
      root.querySelectorAll("[data-emoji]").forEach(function (b) {
        b.addEventListener("click", function () {
          root.querySelectorAll("[data-emoji]").forEach(function (x) { x.classList.remove("is-on"); });
          b.classList.add("is-on");
          root.querySelector('input[name="emoji"]').value = b.dataset.emoji;
        });
      });
      root.querySelectorAll("[data-color]").forEach(function (b) {
        b.addEventListener("click", function () {
          root.querySelectorAll("[data-color]").forEach(function (x) { x.style.borderColor = "transparent"; });
          b.style.borderColor = "var(--ink)";
          root.querySelector('input[name="color"]').value = b.dataset.color;
        });
      });
    });
  }

  function saveCourse() {
    var form = $("#course-form");
    if (!form) return;
    var title = form.elements.title.value.trim();
    if (!title) { toast("Give the course a name.", "warn"); form.elements.title.focus(); return; }

    var c = Store.createCourse({
      title: title,
      description: form.elements.description.value,
      emoji: form.elements.emoji.value,
      color: form.elements.color.value
    });
    if (!c) { toast("Could not create the course.", "warn"); return; }
    closeModal();
    toast("Course created.", "good");
    refreshChrome();
    location.hash = "#/course/" + c.id;
  }

  /* ---------------------------------------------------------- lesson modal */

  function newLessonModal(courseId) {
    var body =
      '<form id="lesson-form" novalidate>' +
        '<div class="field">' +
          '<label for="lf-title">Lesson title</label>' +
          '<input class="input" id="lf-title" name="title" placeholder="e.g. Reading a confidence interval" maxlength="90" required>' +
        "</div>" +
        '<div class="field">' +
          '<label for="lf-body">Your notes</label>' +
          '<textarea class="textarea" id="lf-body" name="body" placeholder="Explain it in your own words. If you cannot, you do not know it yet." maxlength="1200"></textarea>' +
          '<span class="field-hint">Optional, but writing the summary is most of the value.</span>' +
        "</div>" +
      "</form>";

    var foot =
      '<button class="btn btn-ghost" type="button" data-action="close-modal">Cancel</button>' +
      '<button class="btn btn-primary" type="button" data-action="save-lesson" data-course="' + Views.esc(courseId) + '">Add lesson</button>';

    openModal(modalShell("New lesson", body, foot));
  }

  function saveLesson(courseId) {
    var form = $("#lesson-form");
    if (!form) return;
    var title = form.elements.title.value.trim();
    if (!title) { toast("Give the lesson a title.", "warn"); form.elements.title.focus(); return; }
    Store.createLesson(courseId, { title: title, body: form.elements.body.value });
    closeModal();
    toast("Lesson added.", "good");
    render();
  }

  /* ------------------------------------------------------------ card modal */

  function newCardModal(courseId) {
    var lessons = Store.lessonsFor(courseId);
    var options = '<option value="">Not linked to a lesson</option>' +
      lessons.map(function (l) { return '<option value="' + Views.esc(l.id) + '">' + Views.esc(l.title) + "</option>"; }).join("");

    var body =
      '<form id="card-form" novalidate>' +
        '<div class="field">' +
          '<label for="kf-front">Front — the prompt</label>' +
          '<textarea class="textarea" id="kf-front" name="front" placeholder="One question. No “and”." maxlength="300" required></textarea>' +
        "</div>" +
        '<div class="field">' +
          '<label for="kf-back">Back — the answer</label>' +
          '<textarea class="textarea" id="kf-back" name="back" placeholder="The shortest answer that is still complete." maxlength="800" required></textarea>' +
        "</div>" +
        '<div class="field">' +
          '<label for="kf-lesson">Lesson</label>' +
          '<select class="select" id="kf-lesson" name="lessonId">' + options + "</select>" +
        "</div>" +
      "</form>";

    var foot =
      '<button class="btn btn-ghost" type="button" data-action="close-modal">Cancel</button>' +
      '<button class="btn btn-primary" type="button" data-action="save-card" data-course="' + Views.esc(courseId) + '">Add card</button>';

    openModal(modalShell("New card", body, foot));
  }

  function saveCard(courseId) {
    var form = $("#card-form");
    if (!form) return;
    var front = form.elements.front.value.trim();
    var back = form.elements.back.value.trim();
    if (!front || !back) { toast("Both sides are needed.", "warn"); return; }
    Store.createCard(courseId, { front: front, back: back, lessonId: form.elements.lessonId.value || null });
    closeModal();
    toast("Card added.", "good");
    render();
  }

  /* ------------------------------------------------------- confirm modal */

  function confirmModal(title, text, actionLabel, onConfirm) {
    var body = '<p class="page-sub" style="font-size:var(--fs-base)">' + Views.esc(text) + "</p>";
    var foot =
      '<button class="btn btn-ghost" type="button" data-action="close-modal">Cancel</button>' +
      '<button class="btn btn-primary" type="button" id="confirm-yes">' + Views.esc(actionLabel) + "</button>";

    openModal(modalShell(title, body, foot), function (root) {
      root.querySelector("#confirm-yes").addEventListener("click", function () {
        closeModal();
        onConfirm();
      });
    });
  }

  /* ------------------------------------------------------ study session */

  var session = null;

  function startSession(courseId) {
    var queue = Store.dueCards(courseId || null).map(function (c) { return c.id; });
    session = {
      courseId: courseId || null,
      queue: queue,
      index: 0,
      revealed: false,
      answered: 0
    };
    renderStudyStage();
  }

  function ensureSession(courseId) {
    if (!session || session.courseId !== (courseId || null)) startSession(courseId);
    else renderStudyStage();
  }

  function currentCard() {
    if (!session || session.index >= session.queue.length) return null;
    return Store.card(session.queue[session.index]);
  }

  function renderStudyStage() {
    var stage = $("#study-stage");
    if (!stage) return;

    var total = session ? session.queue.length : 0;
    var counter = $("#study-counter");
    var bar = $("#study-bar");

    if (!session || !total || session.index >= total) {
      if (counter) counter.textContent = total + " / " + total;
      if (bar) bar.style.width = "100%";
      stage.innerHTML = Views.studyEmpty();
      return;
    }

    var card = currentCard();
    if (!card) { stage.innerHTML = Views.studyEmpty(); return; }

    if (counter) counter.textContent = (session.index + 1) + " / " + total;
    if (bar) bar.style.width = Math.round((session.index / total) * 100) + "%";

    var co = Store.course(card.courseId);
    var lesson = card.lessonId ? Store.get().lessons.find(function (l) { return l.id === card.lessonId; }) : null;

    stage.innerHTML =
      '<div class="flashcard" id="flashcard" tabindex="0" role="button" ' +
        'aria-label="Flashcard. Press space to reveal the answer.">' +
        '<div class="fc-label">' + (session.revealed ? "Answer" : "Prompt") + "</div>" +
        '<div class="fc-body">' +
          (session.revealed
            ? '<div class="fc-back">' + Views.esc(card.back) + "</div>"
            : '<div class="fc-front">' + Views.esc(card.front) + "</div>") +
        "</div>" +
        (session.revealed
          ? ""
          : '<div class="fc-reveal-hint">Click, or press space, to reveal</div>') +
        '<div class="fc-source">' + Views.esc(co ? co.title : "Unsorted") +
          (lesson ? " · " + Views.esc(lesson.title) : "") +
          " · ease " + (card.ease || 2.5).toFixed(2) + "</div>" +
      "</div>" +
      (session.revealed
        ? '<div class="grade-row">' +
            gradeBtn("again", card) + gradeBtn("hard", card) +
            gradeBtn("good", card) + gradeBtn("easy", card) +
          "</div>"
        : '<div style="margin-top:var(--sp-4);display:flex;justify-content:center">' +
            '<button class="btn btn-primary btn-lg" type="button" data-action="reveal">Reveal answer</button>' +
          "</div>");

    var fc = $("#flashcard");
    if (fc) fc.addEventListener("click", reveal);
  }

  function gradeBtn(rating, card) {
    var label = rating.charAt(0).toUpperCase() + rating.slice(1);
    var hint = Store.previewInterval(card, rating);
    return (
      '<button class="grade grade-' + rating + '" type="button" data-action="grade" data-rating="' + rating + '">' +
        label + "<small>" + hint + "</small>" +
      "</button>"
    );
  }

  function reveal() {
    if (!session || session.revealed) return;
    session.revealed = true;
    renderStudyStage();
  }

  function gradeCurrent(rating) {
    var card = currentCard();
    if (!card || !session) return;
    Store.grade(card.id, rating);
    session.answered++;
    session.index++;
    session.revealed = false;
    renderStudyStage();
    refreshChrome();
  }

  function endSession() {
    if (!session) return;
    var answered = session.answered;
    session = null;
    toast(answered ? "Session ended — " + answered + " answered." : "Session ended.", answered ? "good" : "");
    route();
  }

  /* ------------------------------------------------------------ rendering */

  function parseRoute() {
    var hash = location.hash.replace(/^#\/?/, "");
    var parts = hash.split("/").filter(Boolean);
    if (!parts.length) return { name: "dashboard", params: [] };
    return { name: parts[0], params: parts.slice(1) };
  }

  var TITLES = {
    dashboard: "Dashboard",
    courses: "Courses",
    course: "Course",
    study: "Study",
    stats: "Progress",
    settings: "Settings",
    about: "About"
  };

  function render() {
    var r = parseRoute();
    var html;

    switch (r.name) {
      case "dashboard": html = Views.dashboard(); break;
      case "courses": html = Views.courses(); break;
      case "course": html = Views.courseDetail(r.params[0]); break;
      case "study": html = Views.study(r.params[0]); break;
      case "stats": html = Views.stats(); break;
      case "settings": html = Views.settings(); break;
      case "about": html = Views.about(); break;
      default: html = Views.notFound("That page does not exist.");
    }

    viewEl.innerHTML = html;
    titleEl.textContent = TITLES[r.name] || "Learn It All";

    /* nav highlight */
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      var key = a.dataset.nav;
      var active = key === r.name || (key === "courses" && r.name === "course");
      a.classList.toggle("is-active", active);
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    closeSidebar();
    refreshChrome();

    if (r.name === "study") {
      ensureSession(r.params[0]);
    } else {
      session = null;
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function route() {
    if (modalState.open) closeModal();
    render();
  }

  function refreshChrome() {
    var t = Store.totals();
    var goal = Store.get().settings.dailyGoal || 20;
    var done = Store.reviewsToday().length;

    var cc = document.getElementById("nav-course-count");
    if (cc) cc.textContent = t.courses;

    var db = document.getElementById("nav-due-count");
    if (db) {
      db.textContent = t.due;
      db.hidden = t.due === 0;
    }

    var gc = document.getElementById("goal-count");
    if (gc) gc.textContent = done + " / " + goal;

    var gf = document.getElementById("goal-fill");
    if (gf) gf.style.width = Math.min(100, Math.round((done / goal) * 100)) + "%";

    var gh = document.getElementById("goal-hint");
    if (gh) {
      if (done === 0) gh.textContent = "No reviews yet today.";
      else if (done >= goal) gh.textContent = "Goal met. Anything more is a bonus.";
      else gh.textContent = (goal - done) + " to go.";
    }
  }

  /* -------------------------------------------------------------- sidebar */

  function openSidebar() {
    sidebar.classList.add("is-open");
    scrim.hidden = false;
    var btn = document.getElementById("menu-btn");
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    scrim.hidden = true;
    var btn = document.getElementById("menu-btn");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  /* ---------------------------------------------------------------- events */

  function onAction(e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var action = el.dataset.action;

    switch (action) {
      case "new-course": e.preventDefault(); newCourseModal(); break;
      case "save-course": e.preventDefault(); saveCourse(); break;
      case "new-lesson": e.preventDefault(); newLessonModal(el.dataset.course); break;
      case "save-lesson": e.preventDefault(); saveLesson(el.dataset.course); break;
      case "new-card": e.preventDefault(); newCardModal(el.dataset.course); break;
      case "save-card": e.preventDefault(); saveCard(el.dataset.course); break;
      case "close-modal": e.preventDefault(); closeModal(); break;

      case "cycle-lesson":
        e.preventDefault();
        Store.cycleLessonStatus(el.dataset.lesson);
        render();
        break;

      case "delete-lesson":
        e.preventDefault();
        confirmModal("Delete this lesson?", "The lesson is removed. Any cards attached to it stay in the course, just unlinked.", "Delete lesson", function () {
          Store.deleteLesson(el.dataset.lesson);
          toast("Lesson deleted.", "good");
          render();
        });
        break;

      case "delete-card":
        e.preventDefault();
        confirmModal("Delete this card?", "The card and its review history are removed. This cannot be undone.", "Delete card", function () {
          Store.deleteCard(el.dataset.card);
          toast("Card deleted.", "good");
          render();
        });
        break;

      case "delete-course":
        e.preventDefault();
        confirmModal("Delete this course?", "Every lesson, card and review in this course is removed. This cannot be undone.", "Delete course", function () {
          Store.deleteCourse(el.dataset.course);
          toast("Course deleted.", "good");
          location.hash = "#/courses";
          render();
        });
        break;

      case "reveal": e.preventDefault(); reveal(); break;
      case "grade": e.preventDefault(); gradeCurrent(el.dataset.rating); break;
      case "end-session": e.preventDefault(); endSession(); break;

      case "study-anyway":
        e.preventDefault();
        drillAhead();
        break;

      case "save-goal": {
        e.preventDefault();
        var input = document.getElementById("set-goal");
        var v = parseInt(input.value, 10);
        if (isNaN(v) || v < 5 || v > 200) { toast("Pick a goal between 5 and 200.", "warn"); return; }
        Store.updateSettings({ dailyGoal: v });
        toast("Goal saved.", "good");
        refreshChrome();
        break;
      }

      case "export": {
        e.preventDefault();
        var blob = new Blob([Store.exportJSON()], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "learn-it-all-export.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast("Export downloaded.", "good");
        break;
      }

      case "restore-seed":
        e.preventDefault();
        confirmModal("Restore sample content?", "This replaces everything currently stored with the original sample courses, lessons and cards.", "Restore sample", function () {
          Store.resetAll();
          toast("Sample content restored.", "good");
          render();
        });
        break;

      case "wipe":
        e.preventDefault();
        confirmModal("Erase everything?", "All courses, lessons, cards and review history are deleted from this browser. There is no backup and no undo.", "Erase everything", function () {
          Store.wipe();
          toast("Workspace erased.", "good");
          location.hash = "#/dashboard";
          render();
        });
        break;
    }
  }

  /* Pull every card forward to now so the user can drill before it matures. */
  function drillAhead() {
    var all = Store.get().cards;
    if (!all.length) { toast("There are no cards to drill yet.", "warn"); return; }
    all.forEach(function (c) { c.dueAt = Math.min(c.dueAt, Date.now()); });
    Store.save();
    location.hash = "#/study";
    session = null;
    render();
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      if (modalState.open) { closeModal(); return; }
      if (sidebar.classList.contains("is-open")) { closeSidebar(); return; }
    }

    /* Study shortcuts, but never while typing. */
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (!session || !$("#study-stage")) return;

    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      if (!session.revealed) reveal();
      return;
    }
    if (!session.revealed) return;
    var map = { "1": "again", "2": "hard", "3": "good", "4": "easy" };
    if (map[e.key]) { e.preventDefault(); gradeCurrent(map[e.key]); }
  }

  /* ------------------------------------------------------------------ boot */

  function boot() {
    viewEl = document.getElementById("view");
    titleEl = document.getElementById("topbar-title");
    modalRoot = document.getElementById("modal-root");
    scrim = document.getElementById("scrim");
    sidebar = document.getElementById("sidebar");
    toasts = document.getElementById("toasts");

    Store.load();

    document.addEventListener("click", onAction);
    document.addEventListener("keydown", onKeydown);

    var menuBtn = document.getElementById("menu-btn");
    if (menuBtn) menuBtn.addEventListener("click", function () {
      if (sidebar.classList.contains("is-open")) closeSidebar();
      else openSidebar();
    });
    if (scrim) scrim.addEventListener("click", closeSidebar);

    var quick = document.getElementById("quick-add");
    if (quick) quick.addEventListener("click", newCourseModal);

    window.addEventListener("hashchange", route);

    if (!location.hash) location.replace("#/dashboard");
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
