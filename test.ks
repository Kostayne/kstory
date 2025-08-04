@tag1
" test
  @tag2 tag_two_value # tag comment
  " Test
" test2
# comment
" some_text # comment2
" text3
/* multi */
/* multi2 */ text4
text5 /* multi3 */ text6
  /*
    multi first
    multi second
  */
@tag_pre_text " text inlined with a tag
@tag_pair1 @tag_pair2
@tag_pair_with_val1 val 1 @tag_pair_with_val2 val 2
@@choice_tag with a value
koko

== Section1 after space

-> GotoVal
=> GotoVal2
->Invalid1
=>Invalid2
-> Valid, valid
=> Valid, valid

+ Choice with inlined text # comment
+ Second choice /* multi comment */

+
  ```
  Choice text multiline.
  # even with a regular comment
  /* and multi comment */ Choice text continue.
  ```