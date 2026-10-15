# 04: Interrupted Reply, end to end

**What to build:** When the Owner cuts a Reply short (today with a hold or a typed message), the Reply stays whole in the Transcript, marked as interrupted, and Jarvis is told the Owner only heard about the first part of it. The mark is saved with the Turn, so a resumed Session still shows it. The other form, a Reply shown but never spoken, is handled the same way so that ticket 06 can use it.

**Blocked by:** 01: Prefactor: Push-to-talk captures through a Listener

**Status:** ready-for-agent

Spec: [Hands-free conversation](../spec.md)

- [ ] Voice reports the share of the clip it played when it is stopped
- [ ] A Reply cut short is marked "cut short" with that share in the Transcript entry; a "never spoken" mark exists too
- [ ] The next Turn's request carries an optional mark for the previous Reply (`{ cut: share }` or `{ unspoken: true }`), validated by the request parser
- [ ] The server saves the mark on the previous Turn (a nullable `interrupted` field on the saved Turn, with a migration) and adds a Spanish note for the model saying the Owner didn't hear that Reply, or heard about the first X% of it
- [ ] A resumed Session shows saved Interrupted Replies with their mark; the Transcript and Caption show the mark (placeholder look)
- [ ] A Reply that fails to be spoken is still an error, not an Interrupted Reply
- [ ] Tests: Session (cut by a hold and by typing gives the mark and the request mark), Turn module (saved, model told, returned on resume), request parser
