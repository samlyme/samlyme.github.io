*Credits: Deep Learning, Ian Goodfellow*

> Learning that an unlikely event has occurred is more informative than learning that a likely event has occurred.

Imagine someone told you that the sun rose this morning. This message contains zero information as we consider the event of the sun rising each to have a probability of 1. Now consider that someone else told you that there was a solar eclipse this morning. The event of a solar eclipse is relatively unlikely, thus learning about this event happening is rather informative.

To quantify this, we can use the units of **shannons** or **nats**. They measure the same thing, but are scaled by a constant factor.

We define the **self-information** of an event $x$ as the negative log of the probability of $x$.

$$ I(x) = -P(x) $$

Choosing a log with base 2 gives an result in shannons, and choosing the natural log gives a result in terms of nats.

Now, taking the weighted average of the self-information gives you the **Shannon entropy**, a measure of the expected amount of uncertainty in an entire probability distribution.

$$ H(x) = E(I(X)) $$

## Kullback-Leibler divergence

Given two distributions over the same RV $P(x)$ and $Q(x)$, we can measure how different they are via the **KL divergence**. 

$$ D_{KL}(P||Q) = E_{x ~ P}[\text{log} P(X) - \text{log} Q(x)$$

![](https://i.imgur.com/cpYL0Jc.png)

The KL divergence is not a true distance measure as D (P || Q) != D (Q || P).
