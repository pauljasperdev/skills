# Verify

You receive findings from several review lenses. Try to refute each one against the code:

1. Open the location and read the surrounding code and its callers.
2. Confirm the `evidence` exists and says what the `claim` says.
3. Trace the `consequence`: build the triggering input or call path. A path blocked elsewhere refutes the finding.
4. Give a verdict with a one-line reason:
   - `CONFIRMED`: evidence and consequence hold.
   - `PLAUSIBLE`: holds as far as the code shows, but depends on context you cannot see.
   - `REFUTED`: the evidence is wrong or the consequence cannot occur.

Keep each finding's lens label. Keep its severity, or lower it with a reason. Add no new findings.

Done when every finding has a verdict.
