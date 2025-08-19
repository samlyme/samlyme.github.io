*Credits: Deep Learning, Ian Goodfellow*

## 3.9.6 Mixtures of Distributions

An easy way to create a new, more complex, distribution is to mix existing distributions. Imagine we have *n* independent distributions. On each trial, we pick a specific **component distribution**, denoted by the RV *c*. We then use distribution *c* to generate an RV *x*. 

The probability of picking a specific distribution *ci* is modeled by a **multinoulli distribution**. We do this so we can weight certain distributions more heavily.

Now, the *overall* distribution is modeled by:

*P(x) = sum( P(c = i) P(x | c = i))*

> This can also be interpreted as the marginal probability of *x*

Now, imagine we don't know how to pick the the distribution *c*. In other words *P(c = i)* is unknown. This makes *c* a **latent variable**, meaning it is a random variable that we cannot observe directly. However, this variable still has a measurable impact on the outcome of our system.

Imagine this contrived situation: 
We have a bag of red and blue marbles. We know (somehow) that Factory 1 produces 80% red and 20% blue, and that Factory 2 produces 30% red and 70% blue. However, we don't know how many marbles come from each factory.

In this scenario, our latent variable *c* represents which factory the marble came from. 

Our overall goal is to predict the distribution of marbles in the bag *P(x)*. 

Intuitively, we know that if the bag has mostly red marbles, most of the bag came from Factory 1, and vice versa. Our model **learns** by guessing the values of *P(c)*.

In this situation, it is clear that the latent variable is unnecessary in modeling the distribution of marbles, but it does allow for us to **interpret** why the model is making the predictions that it is. eg. The model is predicting an 80% chance of red because it thinks all the marbles come from Factory 1.

Formally speaking, we have:

Assumptions about the system:
*P(x = red | c = Factory 1) = 0.8* -> Bernoulli Distribution
*P(x = red | c = Factory 2) = 0.3* -> Bernoulli Distribution

**Prior probability: **
*a = P(c = i)* -> Trying to guess the latent variable *c*

**Posterior probability: **
*P(c | x)* -> What is the distribution of *c* give our measurement *x*?

> Intuition tells us that if we get a measurement *x* = Blue, we are more likely to have more marbles coming from Factory 2.

### trust me bro type theorem

> "A Gaussian mixture model is a **universal approximator** of densities, in the sense that any smooth density can be approximated with any specific nonzero amount of error by a Gaussian mixture model with enough components."

## Expectation-maximization

Some python code to solve for the latent variable:
```python
import numpy as np

"""
P(x = red | c = Factory 1) = 0.8 -> Bernoulli Distribution
P(x = red | c = Factory 2) = 0.3 -> Bernoulli Distribution
"""
p_red_given_f1 = 0.8
p_red_given_f2 = 0.3

"""
True proportion from Factory 1
P(c = 1) = 0.6
"""
p_f1 = 0.6

print("Ground truth")
print(f"P(c = Factory 1) = {p_f1:.2f}")
print(f"P(c = Factory 2) = {1 - p_f1:.2f}")
print(f"P(x = red | c = Factory 1) = {p_red_given_f1:.2f}")
print(f"P(x = red | c = Factory 2) = {p_red_given_f2:.2f}")

K = 1000

C = np.random.binomial(1, p_f1, size=K)

# 1 = red, 0 = blue
X = np.where(C  == 1, 
             np.random.binomial(1, p_red_given_f1, size=K), 
             np.random.binomial(1, p_red_given_f2, size=K))

print(f"Generate {K} samples:")
x = np.sum(X)
print("Red: ", x)
print("Blue:", K-x)
print(f"Observed P(x = red): {x/K}")

# Initial random guess of P(c = 1) = 0.5
p_hat_f1 = 0.5

max_iterations = 100
tolerance = 10e-9

for iteration in range(max_iterations):
    p_x_c1 = np.where(X == 1, 
                             p_red_given_f1, 
                             (1 - p_red_given_f1)) * p_hat_f1
    p_x_c2 = np.where(X == 1, 
                             p_red_given_f2, 
                             (1 - p_red_given_f2)) * (1-p_hat_f1)
    # probability of x, with our assumptions of p_hat_f1
    p_x = p_x_c1 + p_x_c2

    # Gamma, the responsibilities ??
    gamma_c1 = p_x_c1 / p_x
    gamma_c2 = p_x_c2 / p_x

    p_hat_f1p = np.sum(gamma_c1) / K

    if np.abs(p_hat_f1p - p_hat_f1) < tolerance:
        print(f"Converged at iteration {iteration}")
        break

    p_hat_f1 = p_hat_f1p
    
    # show progress
    if iteration % 10 == 0:
        print(f"{iteration}: P(c = Factory 1) = {p_hat_f1}")
        
print(f"Final solution: P(c = Factory 1) = {p_hat_f1:.2f}")
    
```

*Note:* This can be generalized to *n* arbitrary component distributions. This is left as an exercise for the reader.

---

[home](/index.html) | [contact](/contact.html) | [blogs](/blogs/index.html)