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

# Function call tests
@call:updateInventory()
@call:setPlayerName("John")
@call:setLevel(10)
@call:sendMessage("Hello", "World")
@call:complexFunction("param1", "param2", "param3")

" Test call in replica: {call:getUserName()}
" Test call with params: {call:getMessage("Hello")}
" Test call with multiple params: {call:formatString("Name", "Value")}

# Test escaping
@call:functionName\(\)
" Escaped call: {call:functionName\(\)}

# Test calls in comments (should be ignored)
# @call:functionName()
# @call:setPlayerName("John")

== test_section

-> test_section
