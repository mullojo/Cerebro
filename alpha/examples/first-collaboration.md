# First collaboration · about five minutes

Choose one small real topic: a weekend plan, a project idea, or a document to review.

First run `./start.command` from alpha and open http://127.0.0.1:4310. The browser and
chat CLI use this same server. You can follow the exercise from either interface.

1. Alex starts his chat using `AGENTS.md` and asks it to capture a brief under
   `knowledge/` with context, options, and one question for Sam.
2. Alex asks: “Create a review task for Sam and send her a handoff pointing to
   the brief. Include what feedback I need.” The chat uses `task` and `message`.
3. Sam starts her chat using `AGENTS.md`, or asks her existing chat to
   check her Cerebro inbox. Her chat reads the brief and the task.
4. Sam asks her chat to acknowledge the message, record her feedback in a new
   knowledge note, complete the review task, and send Alex a response.
5. Alex checks his inbox, reads Sam's response, and makes a decision. His chat
   records the decision with the rationale and source record IDs.
6. Together, note what worked and adjust `knowledge/working-agreement.md`.

Success: both humans can explain the outcome, the supporting files are discoverable,
and neither needs to paste the other person's entire chat history.

For disposable practice, run a separate server with a temporary `CEREBRO_ROOT`
and distinct `PORT`, then pass `--url` to the Node CLI. See README.
