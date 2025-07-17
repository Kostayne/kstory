# Комментарий
# \ - символ экранирования

/*
  Мультистрочный Комментарий
*/

@author Kostayne
@color Red
" Привет

+ "Привет
  @@color red
  @@action hello
  => Normise # редирект на секцию Normise

+ 
  @color orange
  @action wtf
  ```
  Я ваще неадекватный, буду тебе длинную речь толкать.

  Тебе это понятно?
  ```

  -> Inadequate

+ Ладно (Жак Фреско)
  @author Kostayne
  " Что ладно?
  
  " (Возможно он шиз.)

  Ты шиз?
    
  + Рассказать базу
    @author Kostayne
    " Ты втираешь мне какую-то дичь.
    -> Inadequate

== Normise
@author Kostayne
" Какой дефолтный ответ, жуть.

== Inadequate
@author Kostayne
" Рил неадекват, что сказать...

== Decorated
@big @purple @italic @bold 400 " Очень необычный текст