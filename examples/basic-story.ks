# Basic Story Example
# This demonstrates the KStory language features

/*
  This is a multiline comment
  showing the basic story structure
*/

@author Story Author
@version 1.0.0
@title A Simple Adventure

== Chapter_One
" Welcome to your adventure! You find yourself at a crossroads.
" Which path will you choose?

+ Take the forest path
  @@color green
  @@action forest_choice
  -> Chapter_Forest

+ Follow the river
  @@color blue
  @@action river_choice
  -> Chapter_River

+ Stay and rest
  @@color yellow
  @@action rest_choice
  ```
  You decide to rest here for a while...
  
  As you sit, you notice something interesting.
  ```
  -> Chapter_Discovery

== Chapter_Forest
@author Narrator
" Deep in the forest, you encounter a wise old owl.

+ Ask for guidance
  @author Owl
  " The owl shares ancient wisdom with you.
  @call:gainWisdom(5)
  -> Chapter_End

+ Continue exploring
  @author Narrator
  " You venture deeper into the forest...
  -> Chapter_End

== Chapter_River
@author Narrator
" By the river, you meet a friendly fisherman.

+ Help the fisherman
  @author Fisherman
  " You help catch some fish together.
  @call:gainFriendship(3)
  -> Chapter_End

+ Ask about the area
  @author Fisherman
  " The fisherman tells you about the local legends.
  -> Chapter_End

== Chapter_Discovery
@author Narrator
" While resting, you discover an old map!

+ Study the map carefully
  @author Narrator
  " The map reveals hidden treasures nearby.
  @call:gainTreasure(10)
  -> Chapter_End

+ Ignore the map
  @author Narrator
  " You continue your journey without the map.
  -> Chapter_End

== Chapter_End
@author Narrator
" Your adventure comes to an end.
" Thank you for playing!
