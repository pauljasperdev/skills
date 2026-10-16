# Writing the hook

The first three seconds decide whether anyone sees the rest, and most viewers watch without sound. The hook is three things that must say the same thing, in this order of weight: the text on screen, what is shown, and the spoken sentence. A viewer who reads one message and hears another hesitates, and a hesitating viewer swipes.

A topic label is not a hook. "Neo Cloud" names the subject; "Neo Cloud? In 73 Sek. erklärt" tells the viewer what they get and how little it costs them.

## What a hook has to do

- **Relevance:** the viewer knows at once whether this is for them. Name the viewer or their question.
- **Payoff:** what they get, concretely. A real number beats an adjective.
- **Tension:** a reason to stay. Say what the thing is; hold back how or why.

Make the value more immediate, never the wording more dramatic. Every claim stays as true as the recording: a question the speaker raises stays a question on screen.

## The two lines

`hook` in `edit.json` is two lines, each at most 18 characters, set as two pills on the speaker's forehead: the first on teal, the second on white.

- Line 1 carries the question or the claim in two or three words.
- Line 2 carries the payoff. The draft offers "In NN Sek. erklärt" with the video's real length; `assemble` and `sync` warn when the number and the length drift apart.

The spoken hook is fixed by the take. When the take cannot carry the hook, say so; the user can record one.

## Check before building

- Is the topic obvious in the first second, with the sound off?
- Is there a concrete payoff and a reason to keep watching?
- Do the two lines and the spoken sentence mean the same thing?
- Is every claim accurate, including the seconds?
