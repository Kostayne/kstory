@tagFirst start
@@choiceFirst enabled
# Top-level tags should highlight

== Section_One # header comment after name

" Hello {call:inner("x, y", nested(2))} world
-> Section_Two, Section-Three
=> Section-Three

@meta info
@call:init("alpha", 42)

+ Choice one
  -> Section_Two

```multiline
Block text line 1
Block text line 2
```

/* multi
   line comment */

== Section_Two
" Text in second section /* asdasd */
-> Section_One

== Section-Three
# Comment before goto
=> Section_One

== Test_Section_AB

-> Test_Section_AB