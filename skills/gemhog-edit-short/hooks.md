# Writing the hook

The first three seconds decide whether anyone sees the rest, and most viewers watch without sound. The hook is three things that must say the same thing, in this order of weight: the text on screen, what is shown, and the spoken sentence. What is shown is the speaker, doing or holding what the hook package's Visueller Hook says, and, where it names one, the **Beleg** left of the head: a recognisable logo or a picture that raises a question, never extra information. Nothing sits on the face or under the mouth. Every further element on screen weakens the hook. A viewer who reads one message and hears another hesitates, and a hesitating viewer swipes.

A topic label is not a hook. "Neo Cloud" names the subject; "Neo Cloud? In 73 Sek. erklärt" tells the viewer what they get and how little it costs them.

## What a hook has to do

- **Relevance:** the viewer knows at once whether this is for them. Name the viewer or their question.
- **Payoff:** what they get, concretely. A real number beats an adjective.
- **Tension:** a reason to stay. Say what the thing is; hold back how or why.

Make the value more immediate, never the wording more dramatic. Every claim stays as true as the recording: a question the speaker raises stays a question on screen.

## The two lines

`hook` in `edit.json` is one or two lines, each at most 18 characters, set as white pills with black text above the speaker's eyes: one colour and one size for every line. A thought longer than 18 characters becomes another line, never smaller type; the block grows upward, so the face stays free.

- Line 1 carries the question or the claim in two or three words.
- Line 2 carries the payoff. The draft offers "In NN Sek. erklärt" with the video's real length; `assemble` and `sync` warn when the number and the length drift apart.

The spoken hook is fixed by the take. Before the take exists, the lines come from the **Text-Hook** in the video's hook package, split into the two lines; once the take is in, check them against what Paul now says, since he rewords the hook when he records it. When the take cannot carry the hook, say so; the user can record one.

## Check before building

- Is the topic obvious in the first second, with the sound off?
- Is there a concrete payoff and a reason to keep watching?
- Do the two lines, the Beleg and the spoken sentence mean the same thing, and do the lines make sense on their own, without the sentence and without another video?
- Does the Beleg, if there is one, only complement the hook (a logo the viewer knows, a picture that raises a question) and add no information the pills lack?
- Is every claim accurate, including the seconds?
