+++
date = '2025-06-18T20:41:12-07:00'
draft = true
title = 'Union Find Algorithm'
+++

# Union Find Algoritm

*Credits: Princeton's Algorithms, Part I*

Union Find is a classic problem in computer science, which entails forming groups of nodes and determining if two nodes are in the same group.

Formally stated, you have *n* nodes (or sites). `union(n1, n2)` creates a connection between nodes `n1` and `n2`.  `connected(n1, n2)` determines whether the two nodes have any path between them. For example, running `union(n1, n2)` and `union(n2, n3` causes `connected(n1, n3)` to return `true`. 

This means that the relationship of being "connected" is actually an **equivalence relation** and has the following properties:
- Reflexivity: any node *p* is connected to *p*.
- Symmetry: if node *p* is connected to node *q*, then node *q* is connected to node *p*.
- Transitivity: 

We also observe that this insight allows us to simplify our problem. Instead of thinking of specific connections between nodes, we instead just need to pay attention to **connected components of nodes**. 
Any `union(n1, n2)` operation simply joins the that connected components `n1` and `n2` are members of into a larger connected component. `connected(n1, n2)` just checks if `n1` and `n2` are in the same connected component. Our problem description never specified that we need to find the actual path between two nodes! Just that we need to know if such a path exists. 

> As a heuristic, simplifying the problem and discarding unnecessary information leads to better algorithmic results.

A more general term for this problem is the **dynamic connectivity problem**.

## Implementation

For convenience, we will label our *n* nodes *0* to *n-1*. This is so their key can be used as an index to a basic array. For other key data types, hash maps or whatever else can be used instead.

### Quick-find

This approach is considered to be an **eager** approach for reasons we will see later.

We first initialize an array `id[]` of size *n*, such that each value is its own index.

```java
int[] id = new int[n]
for (int i = 0; i < n; i++) {
    id[i] = i;
}
```

When we call `union(n1, n2)` find all the indexes with the same value as `n2` and set them to the value at `n1`. 

```java
public void union(int p, int q) {
    int pid = id[p];
    int qid = id[q];
    for (int i = 0; i < id.length; i++) {
        if (id[i] = pid) id[i] = qid;
    }
}

public boolean connected(int p, int q) {
    return id[p] == id[q];
}
```

#### Why is this approach considered eager? 

This approach is considered eager because it does the work **upfront** when `union` is executed. `connected`, which is an operation that typically happens *after* `union` performs far less "work" comparatively. 

However, we don't actually know when/if a `connected` operation will be performed ahead of time, so the extra work that `union` is doing could be going to waste. 

**For raw algorithmic performance, lazy approaches tend to outperform eager approaches.**

Also, this implementation has a worst case runtime of *O(n)* for the `union` operation, which is **not efficient enough** to scale. 

> Big-Oh isn't everything, emperical testing, yada yada. Point is, we can make this faster.

With this insight, let's try to shift some of the work over to the `connected` operation to create a lazy approach. 

### Quick-union

We initialize our `id[]` array in the same way we did for Quick-find. 

```java
int[] id = new int[n]
for (int i = 0; i < n; i++) {
    id[i] = i;
}
```

However, rather than the `id[n]` denoting the connected component that `n` belongs to, `id[n]` now points to the **parent** of `n`.  If `id[n] == n`, `n` is considered to be the root of that connected component. **All members of a connected component share a root**. Now, to join two connected components, we only need to modify the value of one of the root. 

```java
private int root(int i) {
    while (i != id[i]) i = id[i];
    return i;
}

public void union(int p, int q) {
    int i = root(p);
    int j = root(q);
    // set the root of i to j. implicitly sets the connected component to be "under" j.
    id[i] = j
}

public boolean connected(int p, int q) {
    return root(p) == root(q);
}
```

This is better, but still not good enough. In most cases, the `root` operation runs in *O(log n)* time. But in the worst case, the tree can become "tall and skinny", so the real worst case runtime is *O(n)*.

This runtime is actually worse overall than the Quick-find implementation as both the `union` and `connected` methods make use of the `root` method, so now both of those operations have a worst case runtime of *O(n)*. 

**BUT**, this approach leaves more room for improvement. 

### Improvements to Quick-Union

#### Weighted trees

Before, we arbitrary set the the new of the connected component. We can instead keep track of the size of each subtree and make sure that the larger subtree becomes the new root. This actually **forces** the worst case run time of `root` down to *O(log n)*. The proof and implementation is left as an exercise for the reader.

#### Path compression

When we traverse up the tree via the `root` method, we might as well compress the path of each node for future use. A simple way to do this is set the parent of each node we touch to it's grandparent. This halves the length of the path from each node to it's root.

```java
private int root(int i) {
    while (i != id[i]) {
    id[i] = id[id[i]];
    i = id[i];
    }
    return i;
}
```

An even more powerful path compression technique is to directly set the parent each node we traverse to the root of its connected component. However, in practice, this optimization doesn't actually do much better compared to the basic path compression.

> Side note: the more powerful path compression is actually a form of dynamic programming!

```java
private int root(int p) {
    if (id[p] == p) return p;
    int r = root(id[p]);
    id[p] = r;
    return r;
}
```

---

[home](/index.html) | [contact](/contact.html) | [blogs](/blogs/index.html)