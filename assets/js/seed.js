/* ==========================================================================
   seed.js — starter content
   Every new visitor gets a small, genuinely useful kit so no screen is ever
   a dead end. Users can wipe it from Settings at any time.
   Content here is factual reference material (definitions, dates, formulas).
   ========================================================================== */

window.LIA_SEED = (function () {
  "use strict";

  var DAY = 86400000;

  function ago(days) { return Date.now() - days * DAY; }
  function ahead(days) { return Date.now() + days * DAY; }

  var courses = [
    {
      id: "c-product",
      title: "Product Discovery",
      description:
        "How to find a problem worth solving before you commit a roadmap to it — interviews, evidence, and the discipline of saying no.",
      emoji: "◎",
      color: "#2f5d50",
      createdAt: ago(26)
    },
    {
      id: "c-systems",
      title: "Distributed Systems",
      description:
        "Consistency, partitions, and the awkward truths about coordination. The concepts that explain most production incidents.",
      emoji: "◈",
      color: "#b4674a",
      createdAt: ago(19)
    },
    {
      id: "c-metrics",
      title: "Metrics & Experimentation",
      description:
        "Choosing a metric that can move, sizing a test before you run it, and reading a result without fooling yourself.",
      emoji: "◔",
      color: "#c08a2e",
      createdAt: ago(9)
    }
  ];

  var lessons = [
    /* ---- Product Discovery ---- */
    { id: "l-1", courseId: "c-product", title: "The Mom Test: asking questions that survive politeness", status: "done", position: 0, createdAt: ago(26),
      body: "People will lie to you to be nice. Ask about their past behaviour and concrete events rather than your idea. 'When did you last…' beats 'Would you use…'." },
    { id: "l-2", courseId: "c-product", title: "Separating the problem from the proposed solution", status: "done", position: 1, createdAt: ago(25),
      body: "A request for a feature is a hypothesis about a problem. Restate it as a job-to-be-done before you size it." },
    { id: "l-3", courseId: "c-product", title: "Opportunity solution trees", status: "in_progress", position: 2, createdAt: ago(18),
      body: "Outcome → opportunities → solutions → experiments. Each layer should be justified by the layer above it, never asserted." },
    { id: "l-4", courseId: "c-product", title: "Sizing a bet: reach, impact, confidence, effort", status: "todo", position: 3, createdAt: ago(12),
      body: "RICE forces an explicit confidence number. The value is not the score, it is the argument you have to have to produce it." },
    { id: "l-5", courseId: "c-product", title: "Writing a decision record that survives you", status: "todo", position: 4, createdAt: ago(6),
      body: "Record the options considered and what would change your mind. Future-you needs the reasoning, not the conclusion." },

    /* ---- Distributed Systems ---- */
    { id: "l-6", courseId: "c-systems", title: "CAP is a trade-off under partition, not a menu", status: "done", position: 0, createdAt: ago(19),
      body: "Partitions are not optional. The real choice during a partition is consistency or availability; the rest of the time you have both." },
    { id: "l-7", courseId: "c-systems", title: "Idempotency keys and the exactly-once illusion", status: "done", position: 1, createdAt: ago(17),
      body: "Exactly-once delivery does not exist over an unreliable network. At-least-once plus idempotent handling does the job." },
    { id: "l-8", courseId: "c-systems", title: "Read-your-writes and session stickiness", status: "in_progress", position: 2, createdAt: ago(11),
      body: "Users notice their own writes disappearing far more than stale data elsewhere. Route the session, or carry a version token." },
    { id: "l-9", courseId: "c-systems", title: "Backpressure: the queue is not infinite", status: "todo", position: 3, createdAt: ago(5),
      body: "An unbounded queue converts a slow dependency into an outage with a delay. Bound it and shed load deliberately." },

    /* ---- Metrics ---- */
    { id: "l-10", courseId: "c-metrics", title: "Leading vs lagging indicators", status: "in_progress", position: 0, createdAt: ago(9),
      body: "Revenue is lagging. Activation and time-to-first-value are leading. You can only steer with the second kind." },
    { id: "l-11", courseId: "c-metrics", title: "Minimum detectable effect and why small tests lie", status: "todo", position: 1, createdAt: ago(7),
      body: "Fix MDE and power before launch. Peeking at a test inflates false positives — decide the sample size in advance." },
    { id: "l-12", courseId: "c-metrics", title: "Guardrail metrics: the ones that must not move", status: "todo", position: 2, createdAt: ago(3),
      body: "Every experiment has a way to win that you would not accept. Name it before you look at the primary metric." }
  ];

  var cards = [
    /* Product */
    { id: "k-1", courseId: "c-product", lessonId: "l-1",
      front: "In a discovery interview, what is the strongest kind of question?",
      back: "One about past behaviour: 'Tell me about the last time you had to…'. It is anchored in a real event, so politeness cannot inflate the answer.",
      ease: 2.5, intervalDays: 6, reps: 4, lapses: 0, dueAt: ahead(2), createdAt: ago(26) },
    { id: "k-2", courseId: "c-product", lessonId: "l-2",
      front: "What is the difference between a feature request and a problem statement?",
      back: "A feature request names a solution the customer already picked. A problem statement names the job they were trying to get done — it leaves the solution space open.",
      ease: 2.4, intervalDays: 4, reps: 3, lapses: 1, dueAt: ago(0), createdAt: ago(24) },
    { id: "k-3", courseId: "c-product", lessonId: "l-3",
      front: "Name the four layers of an opportunity solution tree, top to bottom.",
      back: "Desired outcome → opportunities (customer needs) → solutions → assumption-testing experiments.",
      ease: 2.6, intervalDays: 9, reps: 5, lapses: 0, dueAt: ahead(5), createdAt: ago(18) },
    { id: "k-4", courseId: "c-product", lessonId: "l-4",
      front: "What does the C in RICE force you to state explicitly?",
      back: "Confidence — how sure you are about reach and impact. It is the number that turns a ranking into an argument about evidence.",
      ease: 2.3, intervalDays: 2, reps: 2, lapses: 0, dueAt: ago(0), createdAt: ago(12) },

    /* Systems */
    { id: "k-5", courseId: "c-systems", lessonId: "l-6",
      front: "What does CAP actually ask you to choose between, and when?",
      back: "Only during a network partition: consistency or availability. Partitions are not optional, so it is a trade-off under failure, not a permanent menu.",
      ease: 2.5, intervalDays: 7, reps: 3, lapses: 0, dueAt: ago(0), createdAt: ago(19) },
    { id: "k-6", courseId: "c-systems", lessonId: "l-7",
      front: "Why is 'exactly-once delivery' not achievable over an unreliable network?",
      back: "A sender cannot distinguish a lost message from a lost acknowledgement, so it must retry — which makes at-least-once the honest guarantee. Exactly-once is achieved at the processing layer by making handlers idempotent.",
      ease: 2.7, intervalDays: 12, reps: 6, lapses: 0, dueAt: ahead(8), createdAt: ago(17) },
    { id: "k-7", courseId: "c-systems", lessonId: "l-8",
      front: "What guarantee does read-your-writes give a user?",
      back: "Once their write is acknowledged, their subsequent reads will see it. Usually implemented by sticky routing to one replica or by passing a version token forward.",
      ease: 2.4, intervalDays: 3, reps: 2, lapses: 0, dueAt: ago(0), createdAt: ago(11) },
    { id: "k-8", courseId: "c-systems", lessonId: "l-9",
      front: "What does an unbounded queue do to a slow downstream dependency?",
      back: "It hides the slowdown until memory or latency runs out, then fails all at once. It converts a slow dependency into a delayed outage — bound the queue and shed load on purpose.",
      ease: 2.2, intervalDays: 1, reps: 1, lapses: 0, dueAt: ago(0), createdAt: ago(5) },

    /* Metrics */
    { id: "k-9", courseId: "c-metrics", lessonId: "l-10",
      front: "Leading vs lagging indicator — give an example of each for a SaaS product.",
      back: "Leading: percentage of new accounts reaching first value within a day. Lagging: monthly revenue. You can act on the first this week; the second tells you what happened last quarter.",
      ease: 2.5, intervalDays: 5, reps: 3, lapses: 0, dueAt: ago(0), createdAt: ago(9) },
    { id: "k-10", courseId: "c-metrics", lessonId: "l-11",
      front: "Why is peeking at an A/B test early dangerous?",
      back: "Repeated looks raise the false-positive rate well above the nominal 5%. Either fix the sample size in advance or use a sequential method designed for continuous monitoring.",
      ease: 2.3, intervalDays: 2, reps: 2, lapses: 0, dueAt: ahead(1), createdAt: ago(7) },
    { id: "k-11", courseId: "c-metrics", lessonId: "l-12",
      front: "What is a guardrail metric?",
      back: "A metric that must not degrade while you optimise the primary one — e.g. page latency, refund rate, or crash rate. It closes the ways to 'win' that you would reject.",
      ease: 2.6, intervalDays: 8, reps: 4, lapses: 0, dueAt: ahead(3), createdAt: ago(3) }
  ];

  /* Review history across the last 14 days, weighted to look like real use. */
  var reviews = [];
  var perDay = [6, 11, 0, 9, 14, 7, 12, 4, 0, 15, 10, 8, 13, 5];

  for (var d = 13; d >= 0; d--) {
    var n = perDay[13 - d] || 0;
    for (var i = 0; i < n; i++) {
      var cardId = cards[i % cards.length].id;
      var roll = (i + d) % 10;
      var rating = roll < 2 ? "again" : roll < 4 ? "hard" : roll < 9 ? "good" : "easy";
      reviews.push({
        id: "r-" + d + "-" + i,
        cardId: cardId,
        rating: rating,
        reviewedAt: ago(d) - i * 60000
      });
    }
  }
  /* Keep the ordering honest and drop anything in the future. */
  reviews = reviews.filter(function (r) { return r.reviewedAt <= Date.now(); });
  reviews.sort(function (a, b) { return a.reviewedAt - b.reviewedAt; });

  return {
    version: 1,
    courses: courses,
    lessons: lessons,
    cards: cards,
    reviews: reviews
  };
})();
