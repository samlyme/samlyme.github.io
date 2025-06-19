+++
date = '2025-06-18T20:42:11-07:00'
draft = true
title = 'Basic rules of Probability'
+++

*Credits: Deep Learning, Ian Goodfellow*

These are just my notes. I like writing.

# Basic rules of probability

## 3.1 Why Probability?

I'de thought I had a pretty decent understanding of the applications of probability, but this book gave me some non-obvious insights about *why* probability is so important to the study of machine learning and deep learning.

**Probability gives us the ability to quantify and reason about uncertainty.** But *where* does this uncertainty come from? 
1. Inherent **stochasticity**: Sometimes the system we are study is just random by nature.
2. Incomplete **observability**: Sometimes we just don't have access to all the information needed to determine the outcome of system. 
3. Incomplete **modeling**: Some models may need to be simplified for various reasons. Simplifying models usually mean discarding some information. This loss of information leads to uncertainty in the model's predictions. 

One virtue of uncertain rules and models is what I call the "effort to result ratio" (not a real term, but it helps me reason about this topic). The rule "Most birds fly" is pretty much true. The rule "Birds fly, except for very young birds that have not yet learned to fly, sick or injured birds that have lost the ability to fly, flightless species..." is absolutely true, but it takes a lot more "effort" to define. 

> "\[This rule is\] expensive to develop, maintain and communicate and, after all this effort, is still brittle and prone to failure."

For this reason, developing models isn't always only about the fidelity. Making a good choice often comes down to experience, intuition, and taste.

### Views of probability

#### Frequentist probability

Under the **frequentist** view of probability, events and their outcomes are assumed to be reproducible. For example, the result of a given poker hand can be repeated, and the probability of winning that hand can be calculated as the proportion of wins. 

#### Bayesian probability

Under the **Bayesian** view of probability, events and their outcomes are ***not*** assumed to be repeatable. Instead, the probability represents a **degree of belief** of the outcome. Ie. a probability of 1 represents an absolute certain belief in a certain outcome. 

Although we can define these two *types* of probability, as it turns out, the rules to reason about both types of probability are exactly the same (trust me bro). These definitions are just useful for *interpreting* the probability value.

## 3.2 Random Variables

A variable that is random. The "value" of a random variable can be discrete or continuous.

## 3.3 Probability Distributions

### Discrete RV

A description of how probable each outcome of a random variable is. The probability distribution of a discrete RV is typically called the **probability mass function** (PMF), which takes in a value (outcome of the RV) and returns a value between 0 and 1, the probability of that outcome happening. The

Notation: *P*(`x` = *x*) is interpreted as the probability of the random variable x takes on the specific value *x*. (weird ik). 

Notation: `x` ~ *P*(x) is interpreted as "x follows the distribution *P*(x)".

It is not useful to get too caught up in the notation of these functions. 

For a function *P* to be considered a PMF of the RV `x`, it must have the following properties:
- The domain of of *P* must be **exactly** all the possible states of the `x`.
- For any *x* in `x`, *P(x)* is between 0 and 1.
- The sum of all values of *P(x)* = 1. aka *P* is **normalized**.

### Continuous RV

A similar function for a continuous RV is known as the **probability density function** (PDF). 

For a function *p* to be considered a PDF of the RV `x`, it must have the following properties:
- The domain of *p* must be the set of all possible states of `x`.
- For any *x* in `x`, *p(x)* is greater than or equal to 0. *Note:* we do not require that *p(x)* be less than or equal to 1.
- The integral of *p(x)* across its entire domain is 1.

## 3.4 Marginal Probability

#### Joint Probability

A PDF or PMF can be also be a function of multiple RV's. For example, *p(x, y)* is the probability of the specific combination occurring *(x, y)*. The double integral of this function should be 1.

Now that we have a joint probability distribution *p(x, y)*, we can *integrate out* one of the variables to get the **marginal probability** of one of the variables.

For example, *p(x)* = integral (*p(x, y) dy*)

## 3.5 Conditional Probability

*P(y | x)* is interpreted as "the probability of *y* given a specific value of *x*".

*P(y | x)* = *P(y, x) / P(x)*

Note: the conditional probability is not defined when *P(x)* = 0. 

## 3.6 The Chain Rule of Conditional Probabilities

Using some algebra, we notice that:

*P(y, x)* = *P(y | x) \* P(x)*

Furthermore, we can generalize, and treat *P(y, x)* as one variable. Thus,

*P(z, y, x)* = *P(z | y, x) \* P(y | x) \* P(x)*

This is useful because in many cases, the conditional probability of a variable is much easier to find than the "raw" joint probability. For example in language models, the next predicted word is found by taking the word with the highest probability of occurring given the current phrase. This is easier than finding the entire sentence at once, which is analogous to finding the entire joint probability of all its constituent words.

## 3.7 Independence and Conditional Independence

Two RV's are **independent** if they have no effect on each other. Thus,

*P(x, y) = P(x) \* P(y)*. Notated as *x* ⟂ *y*

In some cases, *x* and *y* may be **dependent**, but given a third variable *z*, they "become independent". This means that *x* and *y* are **conditionally independent** given *z*. 

*P(x, y | z) = P(x | z) \* P(y | z)*. Notated as *x* ⟂ *y* | *z*

## 3.8 Expectation, Variance and Covariance

### Expected Value

Let *x* ~ *p(x)*, and *f(x)*.
The **expected value** of *f* is: EV \[*f*\] = integral (*p(x)f(x) dx*)

Treating "EV" as a function, we can say it is a "linear transformation" of *f*:
EV \[ a *f(x)* + b *g(x)* \] = a EV \[*f(x)*\] + b EV \[*g(x)*\]

### Variance

The **variance** gives a measure of how "spread apart" the values of a function of a RV is. 

Let *x* ~ *p(x)*, and *f(x)*.
Var(*f(x)*) = EV \[ (*f(x)* - EV \[*f(x)*\]) ^ 2\]. 

> The intuition behind this is that we are taking the expected value of the difference between the value of *f* and the **expected value** of *f*. Thus, if the **expected distance** between *f* and EV *f* is high, the values of *f* are highly "spread apart". 
>
> The reason we square the difference between *f* and EV *f* is because we need all the values to be positive, **BUT** taking the absolute value has some weird mathematical consequences. 

Now, taking the square root of the variance gives the **standard deviation** σ. We have a distinct name of this value because it is used a lot.

### Covariance

The **covariance** of two values measures how the difference of one variable *x* from EV *x* affects the difference of another variable *y* from EV *y*. (idc if this definition is "wrong", it makes sense to me).

Cov(*f(x)*, *g(x)*) = EV \[(*f(x)* - EV \[*f(x)*])(*g(x)* - EV \[*g(x)*])]

This measure is affected by the *scale* of *f* and *g*. We can "normalize" out this affect by dividing by the standard deviations of *f* and *g* and get the **correlation** of *f* and *g*. 

Corr(f, g) = Cov(f, g) / (σf \* σg)

This gives a "pure" measure of the correlation (lol) of two variables.

### Relationship between Covariance/Correlation and Independence

Covariance and independence are related because two independent variables **must** have a covariance of 0, but a covariance of 0 **does not mean** that the two variables are independent.

This is because covariance is a **purely linear** measurement, and variables can still be dependent via a **nonlinear relation**.

This notion can also be applied to correlation and independence.

### Covariance Matrix

Let ***x*** be a random **vector** with *n* entries, such that each entry is a random variable *xi*.

An *n* x *n* **covariance matrix** can be defined as:
Cov(***x***)*i, j* = Cov(*xi, xj*)

Notice that the diagonal of this matrix is:
Cov(***x***)*i, i* = Cov(*xi, xi*) = Var(*xi*)