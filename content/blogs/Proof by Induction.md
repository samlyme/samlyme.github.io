---
layout: blog
title: Intuition for Inductive Proofs
tags: math
---
# Intro

Proof by induction is just one of those topics in math that is fundamentally 
difficult and unintuitive. As a matter of fact, the top [Mathematics Educators
Stack Exchange](https://matheducators.stackexchange.com/questions/10021/why-are-induction-proofs-so-challenging-for-students) posts of all time directly references how difficulty proofs by induction are for students.

As a current student, it took me 2 separate courses to fully grasp inductive proofs. My first time seeing proof by induction was in my Freshman year for my Discrete Structures class, then 2 years later (now) seeing it again in my Intro to Proofs class I am taking for a Mathematics minor. I was able to understand the concept well enough my first time to pass my exams, but not well enough to really "get" it.

# Standard Recipe

The way induction is typically explained goes like this:
1. Start with a base case that you explicitly show is true.
2. Then build an inductive hypothesis which you *assume* to be true.
3. Using this inductive hypothesis, you can show that whatever you were trying to prove is true in general.

## Example: Bounded Fibonacci 

Lets say we are trying to prove that the Fibonacci Sequence 
$F_n = F_{n-1} + F_{n-2}$, $F_0 = F_1 = 1$ is bounded by $2^n$ for all integers $n \ge 0$. 

For the base cases, we see that:
$$ F_0 = 1 \le 2^0 = 1 $$
$$ F_1 = 1 \le 2^1 = 2 $$
$$ F_2 = 2 \le 2^2 = 4 $$
> We don't explicitly need this many base cases, but it is helpful to see a more concrete "start" of our proof.

Now, we create the inductive hypothesis that this fact holds true for all values $n$ up to an arbitrary value $k$. 

More formally, we say $F_n \le 2^n$ for all $0 \le n \le k$. 

Thus, $F_{k+1} = F_k + F_{k-1} \le 2^{k+1}$.

Using some algebraic manipulation and our inductive hypothesis, we see:
1. $2^{k+1} = 2(2^k) = 2^k + 2^k$
2. $F_k \le 2^k$
3. $F_{k-1} \le 2^{k-1} \le 2^k$

And thus, $F_{k+1} \le 2^{k+1}$.

Therefore, we have proven that the Fibonacci Sequence $F_n$ is always bounded by $2^n$ for all integers $n \ge 0$.

# Isn't this proof circular?

 Isn't this a circular proof? We made a MASSIVE assumption saying that whatever we were proving holds for values up to $k$, doesn't that assumption pretty much just guarantee that our "proof" becomes true even if it was invalid?

# A better intuition.

The problem with this standard explanation is that it doesn't get into the crux of why this works *at all*. At first glance, proof by induction really does seem circular, so what gives? 

## What are we really "saying" with proofs by induction?

Imagine you have an infinite sequence of "questions" $Q = [q_0, q_1, q_2, ...]$. You somehow need to answer all of the questions. We can't answer all the questions individually, because that would take an infinite amount of time. 

However, we find some clever trick that says "if we know that $q_k$ is true, then $q_{k+1}$ is also true". In other words, $q_k$ **implies** $q_{k+1}$ for **all** $k$. 

If we then find out that $q_0$ is true, would that be enough to say that all of the questions in $Q$ is true?

The answer is **yes**, because if $q_0$ is true, then $q_1$ is true. Then, if $q_1$ is true, so is $q_2$. Then, if $q_2$ is true, so is $q_3$, and so on.

*This* is really what we are saying when we say "proof by induction". We are asking the question, does Question $k$ imply Question $k+1$.

## Bounded Fibonacci cont.

Now, let's revisit our problem from earlier with this new idea in mind.

The proposition $F_n \le 2^n$ for all $n \ge 0$ becomes our "list of questions". 
- $q_0$ is the question "is $F_0$ less than or equal to $2^0$?"
- $q_1$ is the question "is $F_1$ less than or equal to $2^1$?"
- ...

Now, lets find our "trick". We ask, if $F_k$ is true, then is $F_{k+1}$ also true?

If $F_k \le 2^k$ is true, then is $F_{k+1} \le 2^{k+1}$ also true?

This is the what our algebraic manipulation shows. That the truth of $F_k \le 2^k$ does, in fact, imply that $F_{k+1} \le 2^{k+1}$ is also true.

Now if we have a "starting point" $F_0 \le 2^0$, we have proved that the $F_n$ is bounded by $2^n$ for all $n \ge 0$.