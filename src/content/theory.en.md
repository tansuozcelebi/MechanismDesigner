# Mechanism Theory — A Working Reference

This document collects the engineering discipline behind KREAMET. It is not an
encyclopaedia; it is the set of concepts, equations and decision criteria you
actually need in order to **design a mechanism that works**, in an order where
each part builds on the last.

Every section answers three questions:

1. What does this concept mean physically?
2. How is it computed, and with which equation?
3. Which design decision does it change — that is, why should I care?

Notation is identical in both languages: lengths in millimetres, angles in
degrees (`°`) in prose and radians in equations, masses in kilograms, torques
in N·m. Vectors are written by their components: `r = (rx, ry)`.

**How to read it.** Chapters 1–6 are structure and mobility, and everything else
depends on them. Chapters 7–18 are analysis: given a mechanism, what does it do.
Chapters 19–24 are synthesis: given a task, what mechanism does it. Chapters
25–31 are dynamics, 32–38 the neighbouring disciplines a linkage designer keeps
running into, and 39–45 what this application does with all of it, worked
examples included. The last four chapters are reference material.

If you are here for one answer rather than a course, chapter 46 is the
questions people actually ask, chapter 42 is the checklist, and chapter 47
defines the vocabulary.

---

# 1. Introduction: what a mechanism is

## 1.1 Definition

A **mechanism** is an assembly of rigid bodies connected by movable joints that
converts an input motion into a definite, repeatable output motion. Three
conditions hold simultaneously:

- The bodies (**links**) are treated as **rigid**; their deformation is
  negligible beside the motion.
- The connections (**joints**) **constrain** relative motion without
  eliminating it.
- The chain is closed, or at least attached to a frame; a free-floating
  collection of bodies is not a mechanism.

A **machine** differs by purpose: a mechanism transmits and transforms motion;
a machine uses that to do work. The same four-bar is a mechanism in a wiper arm
and part of a machine inside a press.

## 1.2 Why linkages still matter

As servo motors and motion controllers get cheap, "give every axis its own
motor" has become the default. Where a mechanism still wins is clear:

- **One actuator, multi-axis motion.** A single motor traces a complex path in
  one revolution. There is no synchronisation problem because synchronisation
  is embedded in the geometry.
- **Repeatability.** The motion depends on manufacturing tolerance, not on
  controller loop time. A good linkage gives a more stable path than a
  closed-loop controlled axis.
- **Speed.** At high cycle rates (packaging, textiles, printing) electronic
  axes run out of bandwidth; cams and linkages do not.
- **Safety and simplicity.** A software fault cannot drive a mechanism to an
  unexpected pose; the set of reachable configurations is physical.

Every method in this document serves one question: *how do I perform a given
task with the fewest actuators, to acceptable accuracy, in a form that can
actually be manufactured?*

## 1.3 The design flow

The classical flow has three stages, and KREAMET follows the same order:

1. **Type synthesis (structural synthesis).** How many links, how many joints,
   of which kinds? The output is a *topology*: which link connects to which
   through what joint. No dimensions exist yet.
2. **Dimensional synthesis.** With the topology fixed, lengths, angles and pivot
   positions are determined. The task enters here: which path, which function,
   which poses?
3. **Analysis and verification.** Position, velocity, acceleration, force,
   singularity, interference, tolerance. This stage *can* reject the synthesis,
   and usually does.

The beginner's mistake is to do stage 2 independently of stage 3. A good path
fit means nothing if the mechanism cannot pass a dead point. That is why
KREAMET's objective measures not only curve error but full rotatability,
transmission angle, singularity margin and buildability together.

## 1.4 Scope

- Planar mechanisms in detail; spatial mechanisms in summary.
- Lower pairs (revolute, prismatic) in detail; higher pairs (cam, gear) at the
  level needed to apply them.
- Rigid-body assumption throughout; compliant mechanisms in their own chapter.
- **Closed-form** solutions preferred everywhere; numerical methods only where
  no closed form exists.

---

# 2. Fundamental concepts

## 2.1 Link

A **link** is a rigid body on which the distance between any two points does
not change. Kinematically, a link's shape does not matter — only the relative
positions of its **joint points**:

- **Binary link:** two joint points. Defined by one length.
- **Ternary link:** three joint points. Defined by a triangle — three side
  lengths, or two sides and the included angle.
- **Quaternary and higher:** four or more points.

In KREAMET, ternary links are parameterised by the third point's polar
coordinate `(r, α)` in the body's own frame. The reason matters: if the three
side lengths were independent variables you would have to enforce the triangle
inequality separately, and the optimiser would keep producing invalid
triangles. With `(r, α)` the body is rigid **by construction** and the third
side follows from the law of cosines:

```
c² = a² + r² − 2·a·r·cos(α)
```

This is a concrete instance of a principle that recurs throughout synthesis:
**eliminate a constraint by parameterisation rather than enforcing it with an
equation.**

## 2.2 Frame (ground)

The reference link against which motion is measured is the **frame**,
conventionally link 1. The choice is arbitrary and can be changed: fixing
different links of the same kinematic chain produces different mechanisms. This
is **kinematic inversion**.

The four inversions of the four-bar chain:

| Link fixed | Resulting mechanism |
|---|---|
| Neighbour of the shortest | Crank-rocker |
| The shortest link | Double crank (drag-link) |
| Opposite the shortest | Double rocker |
| The coupler | Reverse double crank |

Inversion is a cheap source of variety: if a chain does not give the motion you
want, fixing a different link is usually faster than designing a new mechanism.

## 2.3 Joint (kinematic pair)

The element that connects two links and constrains their relative motion.
Classified on two axes:

- **Contact type:** *lower pair* (surface contact), *higher pair* (line or
  point contact).
- **Remaining freedom:** the number of relative degrees of freedom left.

Lower pairs resist wear better (load spreads over a surface); higher pairs
give richer motion (a cam profile can encode any motion law).

## 2.4 Kinematic chain

- **Closed chain:** every link has at least two joints; one or more closed
  loops. Four-bar and eight-bar mechanisms.
- **Open chain:** one end is free. Industrial robot arms.
- **Hybrid chain:** both closed loops and free ends.

A closed chain is stiffer and gives multi-axis motion from one actuator; an open
chain gives a larger workspace but needs an actuator per axis.

## 2.5 Loops

A **loop** is a closed path through links and joints returning to its start.
The number of **independent loops** comes from graph theory:

```
L = j − n + 1
```

with `n` links (frame included) and `j` joints. This is the number of
independent vector closure equations you must write, giving `2L` scalar
equations in the plane.

For KREAMET's eight-bar, `n = 8`, `j = 10`, so `L = 3`: three loops, six scalar
equations, six unknowns (the x and y of three joints) and one known (the motor
angle). This counting consistency is the first check that the topology was
constructed correctly.

## 2.6 Types of motion

| Type | Definition | Example |
|---|---|---|
| Translation | Every point traces the same path; no rotation | Slider |
| Rotation | One point fixed; others trace circles | Crank |
| General planar | Rotation and translation combined | Coupler link |
| Spherical | All points on concentric spheres | Universal joint |
| Spatial | General three-dimensional | RSSR linkage |

General planar motion can be seen at every instant as pure rotation about an
**instant centre**; this is the basis of velocity analysis (Chapter 12).

## 2.7 Path, trace and coupler curve

The curve a point traces is its **path**. The path of a point on the coupler
link is a **coupler curve**, and it is the most productive tool in mechanism
design: a simple four-bar produces approximate straight lines, D shapes,
figure-eights, teardrops and much more, depending on which coupler point you
pick.

KREAMET's heart path is of this family: no link end traces a heart; the heart
is traced by a **marker point** rigidly attached to the output link.

## 2.8 Degrees of freedom (short definition)

The number of independent variables needed to fix the mechanism's
configuration. `M = 1` means one motor suffices and the mechanism is **fully
constrained**. `M = 0` makes it a structure. `M < 0` is overconstrained: either
it will not assemble, or it works only because of special geometry (§5.6).

Chapter 5 treats this in full.

---

# 3. Kinematic pairs

## 3.1 Lower pairs

There are six. Planar mechanisms use only the first two, and rarely the third.

| Symbol | Name | DOF | Motion |
|---|---|---|---|
| R | Revolute (pin) | 1 | Rotation about one axis |
| P | Prismatic (slider) | 1 | Translation along one axis |
| H | Helical (screw) | 1 | Coupled rotation and translation |
| C | Cylindrical | 2 | Independent rotation + translation |
| S | Spherical (ball) | 3 | Free rotation about a point |
| F/E | Planar (flat) | 3 | Two translations + one rotation in a plane |

### 3.1.1 Revolute (R)

The single most important element in mechanism design. Easy to manufacture,
carries load well, its backlash is measurable and boundable, and it lasts.

In the plane an R pair removes two degrees of freedom and leaves one — the
relative rotation angle. As equations, the joint's coordinates on both links
must coincide:

```
x_A^(link i) − x_A^(link j) = 0
y_A^(link i) − y_A^(link j) = 0
```

Two scalar equations, two constraints — exactly the `−2·j₁` term in Grübler's
formula.

### 3.1.2 Prismatic (P)

Allows one link to slide along a fixed direction on another. It also imposes
two constraints in the plane: zero offset perpendicular to the sliding
direction, and constant relative rotation.

Its practical problems exceed those of a revolute:

- Large friction surface, needing lubrication.
- Open to contamination.
- Prone to jamming under side load; the guide length must be long enough
  relative to the stroke (rule of thumb: guide length ≥ 1.5 × stroke, or
  angular slop grows quickly).

Prefer R over P wherever possible. KREAMET uses only revolute pairs, and that
is a deliberate choice.

### 3.1.3 Spherical (S)

The cornerstone of spatial mechanisms. It leaves three degrees of freedom, so
it has no planar counterpart. In spatial four-bars such as RSSR, two S joints
leave the connecting rod's spin about its own axis as a **passive freedom**: it
does not affect the motion but does appear in the mobility count (§5.5).

## 3.2 Higher pairs

Line or point contact. In the plane a higher pair removes one degree of freedom
and leaves two (sliding + rolling).

- **Cam–follower:** the profile directly produces the desired motion law.
- **Gear teeth:** involute profiles give a constant ratio.
- **Rolling contact:** pure rolling adds a constraint and makes the pair behave
  like a lower pair.

Higher pairs simplify the mechanism (a cam encodes complex motion in one link)
but carry high contact stress and require wear management.

## 3.3 Choosing a joint

| Requirement | Choose | Because |
|---|---|---|
| High cycle count, long life | R | Surface contact, standard bearings |
| Linear output | R + linkage (approx. straight line) or P | P risks friction and jamming |
| Arbitrary motion law | Cam (higher pair) | The profile encodes the law directly |
| Spatial motion | S + R | S provides passive freedom, easing assembly |
| Low-cost manufacture | R | A hole and a pin suffice |

## 3.4 Backlash

A real revolute has clearance `δ` between pin and hole. That produces a `±δ/2`
uncertainty in link position, and it **accumulates** along the chain. A
worst-case estimate sums the contributions; a statistical (RSS) estimate is
more realistic:

```
Δ_tip ≈ sqrt( Σ (δ_i/2)² )
```

Design consequence: **do not add joints without reason.** An eight-bar
accumulates twice the backlash of a four-bar. This is why KREAMET's variable
link count is not presented as a free improvement — more links means more
freedom *and* more uncertainty.

---

# 4. Kinematic chains and topology

## 4.1 The graph representation

A kinematic chain can be represented as a **graph** with links as nodes and
joints as edges. This makes three things easy:

- Counting degrees of freedom (edges and nodes).
- Finding independent loops (a cycle basis).
- Checking isomorphism (are two drawings the same chain?).

KREAMET **constructs and verifies** its topology this way: joint–link incidence
must satisfy `Σ deg(link) = 2j`, and a connectivity check requires every body
to reach the frame along some path. Together these ensure a badly wired
topology never reaches the solver.

## 4.2 Link counting and joint distribution

With `n` links and `j` revolute joints in the plane, total incidence is `2j`:

```
2j = 2·n₂ + 3·n₃ + 4·n₄ + ...
n  = n₂ + n₃ + n₄ + ...
```

where `n_k` is the number of links with `k` joints. Combined with `M = 1`,
these give the possible link distributions for a given `n`.

**Six-bar, M = 1:** `n = 6` ⇒ `j = 7`. Then `14 = 2n₂ + 3n₃` with
`n₂ + n₃ = 6` ⇒ `n₃ = 2`, `n₂ = 4`. Exactly two ternary and four binary links.
That distribution yields two distinct topologies: **Watt** (the two ternary
links adjacent) and **Stephenson** (they are not). Both are common in industry
and they behave differently.

**Eight-bar, M = 1:** `n = 8` ⇒ `j = 10`. Solutions are `(n₂,n₃,n₄) = (4,4,0)`
and `(5,2,1)`. There are 16 non-isomorphic eight-bar topologies; all are 1-DOF
but they differ greatly in coupler-curve richness.

## 4.3 Isomorphism

Two chains are **isomorphic** if relabelling nodes turns one into the other —
the same mechanism, drawn differently. Checking for it prevents evaluating the
same topology repeatedly during type synthesis.

Practical tests:

- **Degree sequence:** the sorted list of joints per link. Different ⇒ not
  isomorphic; the same ⇒ inconclusive.
- **Characteristic polynomial:** eigenvalues of the adjacency matrix. Strong,
  but occasionally misleading.
- **Canonical labelling:** exact but expensive; practical for small `n`.

## 4.4 Screening criteria in structural synthesis

Enumeration gives every possible topology, but not all are useful:

- **Degenerate chain:** if a sub-chain has `M = 0` on its own, that part is
  rigid and the chain is effectively smaller.
- **Where the driver goes:** if the motor cannot attach to a link adjacent to
  the frame, transmission becomes awkward.
- **Reach of the output point:** is there a coupler point that can reach the
  target path?
- **Manufacturability:** many links meeting at one pin complicates assembly.

## 4.5 KREAMET's topology family

KREAMET uses one family: **one crank plus N RRR Assur dyads, solved in
series.** Chapter 6 explains why; the topological result is:

```
n = 2 + 2N   links   (frame + crank + two bars per dyad)
j = 1 + 3N   joints  (O2 + three revolute pairs per dyad)
L = j − n + 1 = N     independent loops
M = 3(n−1) − 2j = 1   for every N
```

`N = 3` is the original eight-bar. The family is offered from `N = 1` (four
bars, the classical four-bar) to `N = 6` (fourteen bars).

The restriction is equally clear: only RRR dyads, so no sliders, cams or gears.
In exchange you get **closed-form solution at every size** and **guaranteed
M = 1 at every size**.

---

# 5. Degrees of freedom

## 5.1 The Grübler–Kutzbach formula (planar)

A free rigid body has 3 DOF in the plane. With `n` links one is the frame, so
`3(n−1)` freedoms exist initially. Each lower pair removes 2 and each higher
pair removes 1:

```
M = 3(n − 1) − 2·j₁ − j₂
```

- `n` : number of links, **frame included**
- `j₁`: one-DOF joints (R, P)
- `j₂`: two-DOF joints (cam, gear contact)

## 5.2 Counting correctly

Three classic ways to misapply the formula.

**(a) Forgetting the frame.** A four-bar has `n = 4`: three moving links plus
the frame. Writing `n = 3` gives `M = −2` and the wrong conclusion that it
cannot move.

**(b) Counting a multi-link pin as one joint.** If `k` links meet at one pin,
that is **`k − 1` revolute pairs**, not one. Three links at a pin is two pairs.

This produced a concrete bug in KREAMET: when two later dyads attach to the
same rigid point carried by a bar, there are **two coincident revolute pairs**
there. Treating point identity and pair identity as the same thing undercounts
joints and corrupts the mobility calculation. The fix is to separate `pointId`
(where it is) from `jointId` (which pair it is).

**(c) Counting non-moving connections.** A welded or bolted joint is not a
kinematic pair; it makes two links into one.

## 5.3 Interpretation

| M | Meaning | Example |
|---|---|---|
| M < 0 | Overconstrained (statically indeterminate) | Extra bar in a triangle |
| M = 0 | Structure, no motion | Triangular truss |
| M = 1 | Fully constrained mechanism, one input | Four-bar |
| M = 2 | Needs two inputs | Five-bar |
| M ≥ 3 | Multi-input / robotic | Serial robot arm |

The design target is almost always `M = 1`.

## 5.4 The spatial generalisation

```
M = 6(n − 1) − Σ (6 − f_i)
```

with `f_i` the freedom left by joint `i`: 1 for R and P, 2 for C, 3 for S.

**RSSR:** `n = 4`, joints R, S, S, R.
`M = 18 − [5 + 3 + 3 + 5] = 2`. Two freedoms appear, but in practice the
mechanism is 1-DOF: the second is the connecting rod's **passive spin** about
its own axis and does not affect the output. So:

```
M_effective = M_formula − F_passive
```

## 5.5 Passive freedoms

A passive freedom is a relative motion that does not affect the output. Test:
if locking it (say by replacing an S with a U joint) leaves the motion
unchanged, it was passive.

Passive freedom is **desirable**: it absorbs assembly tolerance and prevents
overconstraint. Replacing the S joints of an RSSR with R joints makes it
unmanufacturable, because four R axes would have to be exactly parallel.

## 5.6 Overconstrained mechanisms

Some mechanisms move despite `M ≤ 0`, thanks to special geometry:

- **Parallelogram linkage:** opposite sides equal, so an extra link can be
  added; the formula says `M = 0` but it works.
- **Bennett linkage:** a spatial four-R chain. The formula gives `M = −2`, yet
  under specific length and twist relations it moves with one freedom.
- **Sarrus linkage:** two RRR chains producing pure translation.

These are **tolerance sensitive**: break the geometric condition and they jam.
Choose them deliberately, never by accident.

## 5.7 Instantaneous (local) freedom

In some configurations a mechanism gains instantaneous freedom beyond what the
formula predicts. That is a **singularity**, and it is Chapter 14's subject.
Degrees of freedom are defined for a general configuration; at special poses
the count fails. So `M = 1` is necessary but not sufficient — you must also
show the mechanism stays away from singularities through the cycle.

## 5.8 Mobility verification in KREAMET

The app computes it two independent ways and compares:

1. The closed formula from the spec: `M = 3(2+2N−1) − 2(1+3N) = 1`.
2. A count over the **constructed graph**: build the link and joint lists and
   recompute `M = 3(n−1) − 2j`.

A mismatch throws. The `Mobility = 1` badge on screen is therefore not a
restatement of the formula but a **measured property of the simulated
mechanism**.

---

# 6. Assur groups and structural synthesis

## 6.1 Definition

An **Assur group** is a portion of a kinematic chain that has zero degrees of
freedom when attached to the frame and cannot be split into smaller such
portions. In the plane:

```
3·n_group − 2·j_group = 0
```

giving the ratio `n : j = 2 : 3`. The smallest solution is `n = 2, j = 3` —
a **dyad**.

## 6.2 Dyad types

Five two-link Assur groups exist; the letters give the joint sequence:

| Type | Joints | Note |
|---|---|---|
| RRR | Three revolute | Most common; solved by circle–circle intersection |
| RRP | Two revolute, one slider | Circle–line intersection |
| RPR | Revolute–slider–revolute | Slider in the middle |
| PRP | Slider–revolute–slider | Two direction constraints |
| RPP | Revolute–slider–slider | Rare |

KREAMET uses **RRR** only. Its solution is the intersection of two circles: it
is closed-form, gives two roots, and root selection determines the assembly
mode. The other types are also closed-form but introduce sliders, which were
rejected on manufacturing and friction grounds.

## 6.3 Why this matters so much

Because an Assur group has **zero** mobility, attaching one to a working
mechanism **does not change** its degrees of freedom. Two large practical
consequences follow.

**(1) A variable link count is safe.** Add as many dyads as you like to a
`M = 1` chain and it stays `M = 1`. KREAMET's 4–14 bar option is a direct
application of this theorem: every size is 1-DOF **by construction**, not by
trial.

**(2) The solution can be sequenced.** Dyads are solved in the order their
anchors become known. Each yields its own unknown in closed form; the full
system is never assembled. That is why there is no Newton iteration anywhere,
and why the loop-closure residual remains a genuine verification.

## 6.4 Dyad solution: circle–circle intersection

For an RRR dyad with bar lengths `r₁` and `r₂` anchored at `P₁` and `P₂`, the
unknown joint `J` is the intersection of two circles:

```
d  = |P₂ − P₁|
a  = (r₁² − r₂² + d²) / (2d)
h² = r₁² − a²
Pm = P₁ + a·(P₂ − P₁)/d
J± = Pm ± h·( −(P₂−P₁)_y , (P₂−P₁)_x )/d
```

A solution exists only if:

```
|r₁ − r₂| ≤ d ≤ r₁ + r₂
```

Otherwise the dyad **cannot assemble** at that motor angle. KREAMET marks the
frame failed and feeds the magnitude of `h² < 0` into the objective as a
measure of "how far short it fell", so the optimiser sees a gradient rather
than a flat plateau.

## 6.5 Two roots: assembly mode

`J₊` and `J₋` are both valid. The same lengths give two different
configurations (assembly modes, branches). Which root is taken is **critical**:

- Choose arbitrarily and the mechanism "jumps" from one mode to the other
  mid-revolution — a physically impossible discontinuity that shows on screen
  as the mechanism folding instantly.
- The correct approach is to pick, at every frame, the root **nearest the
  previous frame's** solution. The solution then stays on one branch.

KREAMET also runs a **warm-up lap**: a full revolution is solved before the
reported one, so `θ = 0` is solved with the same continuity history as every
other frame and the path-closure test becomes meaningful.

## 6.6 Assur group class

A dyad is a **class 2** Assur group. Higher classes exist:

- **Class 3:** four links, six joints; a ternary link surrounded by three
  binary links. No closed-form solution; usually solved numerically.
- **Class 4:** more complex, multi-loop.

A mechanism's **class** is that of its highest-class Assur group. Class 2
mechanisms solve entirely in closed form — decisive when synthesis will make
millions of evaluations.

## 6.7 Decomposition

Decomposing a mechanism into Assur groups gives the solution order:

1. Separate the driver (crank) and the frame. The remainder must have `M = 0`.
2. From the remainder, split off an Assur group whose anchors are known.
3. Repeat until nothing is left.

The decomposition need not be unique; different orders give different solution
sequences but the same result.

---

# 7. The four-bar linkage and the Grashof condition

## 7.1 Why the four-bar

The four-bar is the simplest closed planar chain: four links, four revolute
joints, `M = 3·3 − 2·4 = 1`. Most industrial mechanisms are four-bars, or
combinations of them.

Naming:

- **Ground (`d`)** — the fixed link, the distance between the two fixed pivots.
- **Crank / input (`a`)** — the link driven by the motor.
- **Coupler (`b`)** — connects the two moving links; it undergoes general
  planar motion and traces the interesting curves.
- **Rocker / output (`c`)** — the other moving link attached to the frame.

## 7.2 The Grashof condition

The necessary and sufficient condition for at least one link to fully rotate:

```
s + l ≤ p + q
```

with `s` the shortest, `l` the longest, `p` and `q` the other two.

- **Grashof (`<`):** the shortest link rotates fully.
- **Change point (`=`):** the mechanism folds at some positions, enters a
  singularity and may change branch.
- **Non-Grashof (`>`):** no link rotates fully; all rock.

## 7.3 Classification

Given Grashof, which link is fixed decides the type:

| Fixed link | Type | Behaviour |
|---|---|---|
| Neighbour of `s` | Crank-rocker | Input rotates, output oscillates |
| `s` itself | Double crank | Both input and output rotate |
| Opposite `s` | Double rocker | Both oscillate, coupler rotates |

Motor drive requires a **crank-rocker** or a **double crank**: the driven link
must rotate fully.

## 7.4 Position analysis (closed form)

Vector closure:

```
a·e^{iθ₂} + b·e^{iθ₃} = d + c·e^{iθ₄}
```

Real and imaginary parts give two equations. With `θ₂` known, `θ₃` and `θ₄`
follow. The direct route — and the one KREAMET uses — is the **circle–circle**
approach: the coupler–rocker joint lies at the intersection of a circle of
radius `b` about the crank tip and one of radius `c` about the fixed pivot.

Freudenstein's equation (Chapter 20) states the same problem in angles:

```
K₁·cos θ₄ − K₂·cos θ₂ + K₃ = cos(θ₂ − θ₄)
K₁ = d/a,  K₂ = d/c,  K₃ = (a² − b² + c² + d²)/(2ac)
```

which is directly useful for **function synthesis**: the three unknowns
`K₁, K₂, K₃` follow linearly from three position pairs.

## 7.5 Coupler curves

A point `P` on the coupler traces, in general, a **sextic** (sixth-degree)
algebraic curve. That high degree is why a four-bar can produce such varied
shapes.

Special forms:

- **Approximate straight lines:** Watt, Chebyshev, Hoeken, Roberts.
- **Dwell:** part of the curve nearly coincides with a circular arc; attaching
  a second link there makes the output pause.
- **Symmetric curves:** when `b = c` and `P` lies on the axis of symmetry.

## 7.6 Proportions and practical limits

Link ratios affect both kinematics and manufacture:

- Very short crank with a very long coupler: good transmission angle, small
  output stroke.
- Nearly equal lengths: large stroke, but a risk of working near singularity.
- Rule of thumb: no link shorter than one fifth of the longest, or joint
  bearings overlap and the body cannot be made.

KREAMET folds this into the objective as a **ratio penalty** weighted by `w₆`
and forces every member into the 50–200 mm band.

---

# 8. Position analysis — closed-form methods

## 8.1 The problem

Given the input angle `θ`, find every joint coordinate. This precedes every
other analysis and is repeated hundreds of times per revolution, so its speed
and reliability are critical.

## 8.2 The vector loop method

For each independent loop the vectors sum to zero:

```
Σ L_i · e^{i θ_i} = 0
```

Each loop gives two scalar equations in the plane, so `L` loops give `2L`
equations in `2L` unknowns. General, but usually requiring Newton–Raphson.

## 8.3 The dyad method (preferred)

If the mechanism decomposes into Assur dyads, each dyad yields its unknown in
closed form and the system is never assembled:

1. The crank tip follows directly: `A = O₂ + a·(cos θ, sin θ)`.
2. The first dyad's two anchors are known ⇒ circle–circle ⇒ `J₀`.
3. With `J₀` known, the rigid points carried by that dyad's bars follow.
4. The second dyad's anchors are now known ⇒ `J₁`. And so on.

Cost: a few square roots and multiplications per dyad. 720 frames × 3 dyads
takes milliseconds in a browser — which is what makes evaluating hundreds of
thousands of candidate mechanisms possible.

## 8.4 Rigid point transform

For a bar anchored at `P` with dyad joint `J`, the third point on the bar is:

```
u = (J − P) / |J − P|
v = (−u_y, u_x)
E = P + r·cos(α)·u + r·sin(α)·v
```

`r` and `α` are design variables; `E` is derived each frame. The formulation
preserves rigidity **by construction**: `|E − P| = r` holds exactly and no
numerical error accumulates.

## 8.5 The loop-closure residual

In a closed-form solution the loop equations are not *solved* — they are
*checked* afterwards. For each loop:

```
res = | Σ vectors |
```

This should sit at machine precision (≈10⁻¹³ mm). If it is large, either the
topology is wrong, or the rigid-point transform is inconsistent, or a bar
length comes from an independent variable rather than from geometry.

Had Newton iteration been used, this residual would be the iteration's stopping
criterion and would verify nothing. Because the solution is closed-form it is
an **independent test**. That distinction is one of KREAMET's architectural
decisions.

## 8.6 Failure modes

| Symptom | Cause | Response |
|---|---|---|
| `h² < 0` | Dyad cannot reach | Change bar lengths; use the shortfall as a penalty |
| Two roots nearly equal | Near singularity | Check transmission angle; reject |
| Root selection jumps | Branch continuity failure | Pick nearest to previous frame; widen tolerance |
| NaN propagates | `d = 0` (coincident anchors) | Impose a minimum anchor separation |

## 8.7 Numerical conditioning

When `d` approaches `r₁ + r₂`, `h² = r₁² − a²` is the difference of two nearly
equal numbers and suffers catastrophic cancellation. A better-conditioned form:

```
h² = ((r₁+r₂)² − d²) · (d² − (r₁−r₂)²) / (4d²)
```

KREAMET uses a rearrangement of this kind and additionally returns the
shortfall (`gap`) when the intersection fails.

---

# 9. Position analysis — numerical methods

## 9.1 When they are needed

Closed form is not always available. Class 3 and higher Assur groups, complex
spatial chains and free-form topologies require numerical solution. So do most
**inverse kinematics** problems (given the output, what is the input?).

## 9.2 Newton–Raphson

With constraints `F(q) = 0`:

```
q_{k+1} = q_k − J(q_k)^{-1} · F(q_k),    J = ∂F/∂q
```

Convergence is quadratic, subject to two conditions: the initial guess must be
close enough, and `J` must not be singular — near a singularity the method
diverges or jumps to another branch.

When sweeping a revolution, **the previous frame's solution is the initial
guess**. That nearly guarantees convergence and provides branch continuity for
free. But it needs a small angular step; too large a step can slide onto
another branch unnoticed.

## 9.3 Homotopy / continuation

Solve a hard system by continuously deforming an easy one:

```
H(q, s) = (1−s)·G(q) + s·F(q),   s: 0 → 1
```

For polynomial systems this finds **all** solutions — valuable in synthesis
(how many distinct mechanisms perform the task?). Expensive; a research tool
rather than a daily one.

## 9.4 Gröbner bases and resultants

Substituting the half-angle `t = tan(θ/2)` eliminates trigonometry and turns
the constraints into a polynomial system that can be solved algebraically. This
tells you exactly **how many assembly modes** a mechanism has:

four-bar 2; Stephenson six-bar 4; Watt six-bar 6; general eight-bar up to 16.

That number is why branch continuity must be taken seriously: sixteen distinct
geometries can be assembled from the same link lengths, and only one traces the
path you want.

## 9.5 The hidden cost of iteration

In an iterative solution the loop-closure residual **is** the stopping
criterion, not an independent check. Setting a `1e−10` tolerance and reporting
"closure error 1e−10" is a tautology. In closed form the residual is measured
independently of the computation.

This is the engineering justification for KREAMET's RRR-only choice: the
reported `1.3 × 10⁻¹³ mm` is a real measurement.

---

# 10. Branch (assembly mode) and continuity

## 10.1 What an assembly mode is

For the same link lengths and the same input angle, a mechanism can be
assembled in more than one geometric configuration. These are **assembly
modes**, **branches** or **circuits**.

A four-bar has two: the coupler–rocker joint lies on one side of the line
through the crank tip, or the other.

## 10.2 Circuit versus branch

Two distinct concepts, often conflated:

- **Circuit:** the set of configurations reachable without disassembling the
  mechanism. Moving between circuits requires taking it apart.
- **Branch:** within a circuit, a region reachable without passing through a
  singularity.

The design consequence is the same either way: **the working cycle must stay
within a single branch.** Otherwise the mechanism either jams or transfers
unpredictably.

## 10.3 Maintaining continuity

**(a) Sign selector.** Make the sign of `±h` a design parameter. Simple but
wrong: with a fixed sign, the mechanism cannot take the other root when it
physically must, and the solution becomes discontinuous.

**(b) Nearest to the previous frame.** Compute both roots each frame and take
the one closer to the previous solution. This is the physically correct
behaviour — a real mechanism moves continuously.

**(c) Numerical continuation.** Seed Newton from the previous solution. Same
effect as (b), at extra cost.

KREAMET uses (b) and additionally **measures** the jump: if the joint
displacement between consecutive frames exceeds a threshold, an
`assemblyJumps` counter increments and the design is rejected.

## 10.4 Choosing the jump tolerance

Too tight and legitimate fast motion is flagged; too loose and real jumps slip
through. A scaled approach:

```
tol = k · (2π / N_frames) · L_characteristic
```

with `k ≈ 3–5` working well in practice. Because dragging the crank by mouse
can step the angle a long way in one frame, KREAMET widens the tolerance by 4×
in interactive mode to avoid false warnings.

## 10.5 Passing through a dead point

Which branch a mechanism takes through a singularity is **undetermined**; in a
real system inertia, friction or an auxiliary element decides:

- **Flywheel:** carries through by inertia.
- **Offset link:** a second mechanism supplies torque at the dead point.
- **Spring:** biases the preferred direction.
- **Double-crank design:** never pass a dead point at all.

In synthesis the cleanest answer is the last: select designs that stay away
from dead points. A lower bound on transmission angle does exactly that.

## 10.6 The warm-up lap

At `θ = 0` there is no "previous frame". If the root is chosen arbitrarily,
`θ = 0` and `θ = 2π` can end up on different branches and the path fails to
close — an artefact of measurement, not a real defect.

The fix: **solve a full revolution before the reported one.** KREAMET does
this and measures path closure at `1.4 × 10⁻¹⁴ mm`.

---

# 11. Velocity analysis

## 11.1 Why a separate analysis

Position analysis says where the mechanism is; velocity analysis says how fast
it moves. It is needed for actuator sizing, inertia forces, singularity
detection and mechanical advantage.

## 11.2 By differentiation

Differentiating `F(q, θ) = 0` in time:

```
∂F/∂q · q̇ + ∂F/∂θ · θ̇ = 0
⇒ q̇ = −J⁻¹ · (∂F/∂θ) · θ̇
```

`J = ∂F/∂q` is the **Jacobian**. Velocity analysis reduces to solving a linear
system; if `J` is singular the velocities cannot be found — which is where the
definition of singularity comes from.

## 11.3 The vector method

Between two points on a rigid body:

```
v_B = v_A + ω × r_{A→B}
```

In the plane `ω × r = ω·(−r_y, r_x)`. For a four-bar this gives two scalar
equations in two unknown angular velocities, solved directly.

## 11.4 Finite differences

If the closed-form position solution is fast, velocity can be differentiated
numerically:

```
v ≈ (P(θ+h) − P(θ−h)) / (2h) · θ̇
```

Central differences are `O(h²)`; `h ≈ 1e−4` rad balances truncation against
rounding in double precision.

KREAMET takes this route and **seeds the solve from the previous frame** —
otherwise `θ+h` and `θ−h` may land on different branches and the derivative is
meaningless. This is an easily missed trap in any mechanism code that uses
finite differences.

## 11.5 Velocity ratio and mechanical advantage

From power conservation (frictionless):

```
T_in · ω_in = F_out · v_out
MA = F_out / F_in
```

Mechanical advantage varies with configuration and goes to zero or infinity at
singularities. So "this mechanism has a mechanical advantage of 3" is
incomplete; report the **worst value over the cycle**.

## 11.6 The velocity polygon

The graphical method: velocity vectors placed head to tail forming a closed
polygon. Not used for computation any more, but still valuable for intuition —
a very short side means that link is nearly stationary; a very long one means a
singularity is close.

---

# 12. Instant centres

## 12.1 Definition

The relative motion of two bodies can, at any instant, be seen as pure rotation
about a point — the **instant centre** `I_{ij}`.

- `I_{ij} = I_{ji}`.
- At that instant the two bodies have equal velocity there.
- An `n`-link mechanism has `n(n−1)/2` instant centres.

## 12.2 Kennedy's theorem

The three instant centres of three bodies are **collinear**:

```
I₁₂, I₁₃, I₂₃  lie on one line
```

This lets unknown centres be found geometrically from known ones, and it is the
most powerful tool in hand analysis.

## 12.3 The four-bar's six centres

- `I₁₂ = O₂`, `I₁₄ = O₄` — the fixed pivots.
- `I₂₃ = A`, `I₃₄ = B` — the moving joints.
- `I₁₃` — coupler to frame: intersection of lines `O₂A` and `O₄B`.
- `I₂₄` — input to output: intersection of `AB` and `O₂O₄`.

`I₁₃` matters most: it is the coupler's instantaneous centre of rotation, so
the velocity of every coupler point follows from rotation about it.

## 12.4 Velocity ratio from instant centres

```
ω₄ / ω₂ = |I₁₂ I₂₄| / |I₁₄ I₂₄|
```

If `I₂₄` goes to infinity (`AB` parallel to `O₂O₄`) the ratio is 1 —
parallelogram behaviour. If it falls on `O₂` the output stalls; on `O₄` the
input locks.

## 12.5 Instant centres and singularity

Singularities correspond directly to degenerate instant centres: when `I₂₄`
coincides with `O₂` or `O₄` the mechanism is at a dead point. This is how to
**see** a singularity geometrically without computing a Jacobian.

## 12.6 Curvature of the coupler curve

The Euler–Savary equation gives the centre of curvature of the path traced by a
coupler point:

```
(1/r − 1/r') · sin ψ = 1/a
```

Its practical consequence: points on the **inflection circle** move in an
instantaneously straight line (infinite radius of curvature). Approximate
straight-line mechanisms rely on this — the point is kept near the inflection
circle through most of the cycle.

---

# 13. Acceleration analysis

## 13.1 Why

Inertia forces are `F = m·a` and easily exceed weight at speed. Joint loads,
bearing selection, body strength and motor torque all require it.

A sense of scale: at 60 rpm, `ω = 6.28 rad/s`; at a 150 mm radius the
centripetal acceleration is `5.9 m/s²`, about 0.6 g. At 600 rpm the same point
sees `591 m/s²`, 60 g. Ten times the speed is a hundred times the inertia.

## 13.2 The rigid-body equation

```
a_B = a_A + α × r_{A→B} + ω × (ω × r_{A→B})
```

Three terms: the reference point's acceleration, the **tangential** term from
angular acceleration, and the **centripetal** term, which in the plane is
`−ω²·r`.

## 13.3 Coriolis acceleration

If two bodies **slide** relative to each other an extra term appears:

```
a_Coriolis = 2 · ω × v_rel
```

It must be included for sliding joints and cam followers. A mechanism with only
revolute joints has no Coriolis term — a side benefit of KREAMET's pure-RRR
choice.

## 13.4 Second-order finite differences

```
a ≈ (P(θ+h) − 2·P(θ) + P(θ−h)) / h² · θ̇²  +  (P(θ+h) − P(θ−h))/(2h) · θ̈
```

At constant speed the second term vanishes. The choice of `h` is more critical
than for velocity: the second difference amplifies rounding error by `1/h²`. In
double precision `h ≈ 1e−3 … 1e−4` rad is appropriate. Branch seeding is again
mandatory — all three points must be on the same branch.

## 13.5 Jerk

The third derivative, `da/dt`, is critical in cam design: discontinuous jerk
produces vibration and noise. Linkage motion is naturally smooth (analytic
functions), so jerk is rarely a problem — an important advantage over cams.

---

# 14. The Jacobian and singularities

## 14.1 The constraint Jacobian

With constraints `F(q) = 0`:

```
J_{mn} = ∂F_m / ∂q_n
```

Its size is `2L × 2L` for `L` independent planar loops.

## 14.2 What a singularity is

When `det(J) = 0`, the velocity equation has no solution or infinitely many;
the mechanism instantaneously gains or loses a freedom, and a small input
change produces a large output change (or vice versa).

## 14.3 Types

**(a) Input singularity (dead point).** The input moves but the output does
not. Occurs when the crank and coupler become collinear. Torque goes to
infinity.

**(b) Output singularity.** The output can move with the input locked; the
mechanism gains a freedom. Dangerous in parallel mechanisms — the structure
becomes uncontrollable.

**(c) Combined.** Both at once, in special geometries.

## 14.4 The smallest singular value

`det(J)` alone is a poor measure: it depends on units and scale and overflows
for large matrices. A better measure is the **smallest singular value**:

```
σ_min(J) = sqrt( λ_min(JᵀJ) )
```

`σ_min → 0` indicates approach to a singularity. The **condition number**
`κ = σ_max / σ_min` is also used.

KREAMET computes the eigenvalues of `JᵀJ` by Jacobi rotations and tracks
`σ_min` through the revolution.

## 14.5 Transmission angle: a free and exact proxy

Computing a Jacobian is expensive. For RRR dyads there is a much cheaper and
**exact** proxy.

The determinant of a dyad's `2×2` Jacobian block is proportional to the sine of
the angle between its two bars:

```
det(J_dyad) ∝ r₁ · r₂ · sin(μ)
```

So `μ → 0` or `μ → 180°` zeroes the determinant — exactly the singularity
condition. And `μ` is already computed during position solution by the law of
cosines, so it costs **nothing extra**.

This is decisive when synthesis makes hundreds of thousands of evaluations: the
singularity penalty is computed exactly, without ever forming a Jacobian.

## 14.6 Avoiding singularities

- **By design:** keep the transmission angle within `40°–140°` through the
  cycle.
- **By path planning:** put the singular region outside the workspace.
- **By redundancy:** add an actuator or a link (common in parallel mechanisms).
- **By inertia:** carry through with a flywheel (useless at low speed).

## 14.7 The singularity locus

In design space, `det(J) = 0` defines a surface that partitions the workspace
into reachable regions. If moving between two points requires crossing it, the
mechanism cannot connect them with continuous motion. In synthesis this becomes
a direct constraint: the whole target path must lie in **one singularity-free
region**.

---

# 15. Transmission angle and mechanical advantage

## 15.1 Definition

The **transmission angle `μ`** is the angle between the coupler and the output
link. It measures how efficiently force is transmitted:

- `μ = 90°`: force entirely in the useful component; ideal.
- `μ → 0°` or `180°`: almost all of the force goes into the bearing and the
  useful torque approaches zero.

## 15.2 Computation

By the law of cosines, for an RRR dyad with bar lengths `r₁, r₂` and anchor
separation `d`:

```
cos μ = (r₁² + r₂² − d²) / (2 r₁ r₂)
```

## 15.3 The effective transmission angle

`μ` and `180° − μ` are equally good (force transmission is symmetric), so
reduce to one number:

```
μ_eff = min(μ, 180° − μ)
```

which lies in `[0°, 90°]`, best at `90°`. When evaluating a design, report the
**smallest `μ_eff` over the whole cycle**.

## 15.4 Acceptance limits

| `μ_eff` | Assessment |
|---|---|
| ≥ 60° | Excellent; safe at high load and speed |
| 45°–60° | Good |
| 40°–45° | Acceptable; bearing loads rise |
| 30°–40° | Marginal; low load only |
| < 30° | Reject; jamming and wear risk |

## 15.5 An analytic ceiling — a worked case

This result came out of KREAMET's design and **corrected the specification**,
so it is worth spelling out.

The input dyad runs from the crank tip (`A`) to the second fixed pivot (`O₄`).
With crank `a = 50 mm` and pivot spacing `d = 120 mm`, the distance `|A O₄|`
sweeps this band every revolution:

```
d_min = 120 − 50 = 70 mm
d_max = 120 + 50 = 170 mm
```

Holding `μ ≥ μ_min` across the whole band requires two inequalities at once.
Eliminating `r₁r₂` between them:

```
4·r₁·r₂·cos μ ≥ d_max² − d_min² = 170² − 70² = 24000
2·r₁·r₂·(1 − cos μ) ≤ d_min² = 4900
```

From the second, `r₁r₂ ≤ 2450/(1−cos μ)`. Substituting into the first:

```
9800·cos μ ≥ 24000 − 24000·cos μ
33800·cos μ ≥ 24000
cos μ ≥ 0.71006
μ ≤ 44.75°
```

**So with this frame and this crank, the input dyad's transmission angle can
never exceed 44.75°, in any design.** Equality occurs at
`r₁ = r₂ = 91.9 mm`.

The textbook `60°–120°` "optimum band" is therefore **unreachable** for this
problem. The `40°–140°` hard limit is reachable, but only in a narrow band of
link lengths.

Design decision: reference the singularity penalty to `45°`, not `60°`, so it
is zero at the physical optimum and still carries a gradient. Without that, the
optimiser chases an unreachable target and sacrifices curve fit for nothing.

The only way to widen the band is to change the geometry. At `d = 200 mm` the
same computation gives `μ_max = 61.5°`.

## 15.6 Multi-dyad chains

Each dyad has its own `μ`; the chain's quality is set by the worst:

```
μ_chain = min_k ( min(μ_k, 180° − μ_k) )
```

KREAMET computes this every frame, takes the minimum over the revolution,
displays it and feeds it into the objective. Designs below the hard threshold
are **rejected** regardless of curve fit.

---

# 16. Dead points and working range

## 16.1 Dead points

Positions where input motion cannot be transmitted to the output — in a
four-bar, when coupler and output become collinear (`μ = 0°` or `180°`). There
the output velocity is zero, the required input torque is theoretically
infinite, and the mechanism cannot decide which way to continue.

## 16.2 Limit positions

The ends of the output's oscillation, where the crank and coupler are aligned
or overlapped:

```
d_far  = a + b
d_near = |b − a|
```

`μ` is usually worst at these positions, so that is where the design is
checked.

## 16.3 Time ratio

Forward and return strokes of a crank-rocker take different times:

```
Q = (180° + β) / (180° − β)
```

`Q > 1` is a **quick-return** mechanism — used in shapers, saws and presses so
the working stroke is slow and the return is fast. `Q = 1` requires symmetry.

## 16.4 Workspace

The set of points the output can reach, bounded by reachability (links fully
extended or folded), singularity (`det(J) = 0`), interference and joint limits.

The usable region is the **intersection** of all four, and it is usually far
smaller than the geometric reach. Checking reach alone and ignoring singularity
is a frequent mistake.

## 16.5 Full rotatability

For a motor-driven mechanism the input link **must** rotate fully. KREAMET
measures this directly: 720 frames are attempted and all must solve. Partial
success (say `335/720`) is not "somewhat good" — it is a mechanism that cannot
be turned by a motor.

## 16.6 Self-locking

With enough friction a mechanism will not move even under applied force:

```
tan(μ_eff) < f       (f: friction coefficient)
```

For `f = 0.15` that means `μ_eff < 8.5°`. So a lower bound on `μ` is not only
about efficiency — it is about **whether the thing works at all**.

The threshold is uncomfortably close to angles that real optimisers return. A
search with a weak transmission-angle term will happily hand back `μ_min = 10°`,
which is 1.5° of margin against a coefficient of friction that is itself only
known to within a factor of two. That is not a design; it is a coin toss
performed at assembly time.

## 16.7 Passing through a dead point

A mechanism does reach configurations of zero mechanical advantage in normal
operation — every crank-rocker passes two of them per revolution — and it gets
through them on **momentum**, not on torque. Three consequences follow:

- The mechanism must be moving when it arrives. Starting from rest exactly at a
  dead point, it does not start at all, which is why some machines need to be
  nudged by hand after a stop in the wrong place.
- A flywheel is not only a smoothing device here; it is what carries the
  mechanism across.
- Which way it continues is decided by the branch it is on, not by the applied
  torque. A dead point is where a simulator loses branch continuity if the
  seeding is wrong (§10), and it is why the nearest-root rule is stated in terms
  of the *previous* solution rather than a sign convention.

Redundancy is the structural fix: two mechanisms out of phase, or a second loop
that is away from its dead point whenever the first is at one. That is one of
the reasons multi-loop chains are more forgiving than a single four-bar, and it
is worth remembering when a design keeps stalling at the same crank angle.

---

# 17. Coupler curves

## 17.1 Why the coupler

Joint points trace circles or arcs — uninteresting. The richness lies in points
**on the coupler link**: because they undergo general planar motion, their
paths are high-degree curves. A four-bar coupler curve is generally a **sextic**
with three double points, which is why it can self-intersect.

## 17.2 The family

The same four-bar gives very different curves depending on which coupler point
is chosen: approximate straight lines, teardrops, figure-eights, dwell curves,
and symmetric curves when the point lies on an axis of symmetry.

## 17.3 Classical straight-line mechanisms

| Mechanism | Character | Use |
|---|---|---|
| Watt | Two equal links, coupler midpoint; figure-eight | Steam engine |
| Chebyshev | Symmetric; very flat central region | Walking machines |
| Hoeken | Chebyshev inversion; near-constant speed on the flat | Conveyors, walkers |
| Roberts | Triangular coupler; long straight portion | Suspension |
| Peaucellier | Eight links; an **exact** straight line | Theoretical importance |

**Hoeken** is particularly useful: on the straight portion the coupler point
advances at nearly constant speed. Typical proportions (`a` crank, `d` ground):
`a = 1`, `b = c = 2.5`, `d = 2`, with the coupler point 2.5 units along the
extension of `AB`.

## 17.4 Dwell mechanisms

To make an output pause:

1. Find a region of the coupler curve that closely approximates a circular arc.
2. Attach a second link at that arc's centre, with length equal to its radius.
3. While the point traverses that region, the attached link barely rotates.

This is the basis of six-bar dwell mechanisms. It does the job of a cam without
contact stress or wear.

## 17.5 Atlases and automated search

The classical approach catalogued curve shapes by scanning length ratios
(Hrones–Nelson, 1951; about 7000 curves). The numerical replacement is
automated search: sample the length space, compute each coupler curve, rank by
similarity to the target. KREAMET does this with directed optimisation rather
than blind scanning, and adds kinematic validity alongside similarity.

## 17.6 Fourier descriptors

A closed curve parameterised in the complex plane expands as

```
z(t) = Σ c_k · e^{i k t}
```

and the coefficients are a **shape signature**. Translation and rotation change
them predictably, which speeds up atlas search enormously. The limitation is
that the signature smooths small but important local features — like the cusp
at the bottom of a heart — so the final comparison should be geometric.

## 17.7 The heart specifically

Two features make the heart hard:

- **The bottom cusp:** the curve's derivative is discontinuous there. A linkage
  produces analytic motion and therefore **cannot** produce a true cusp; it can
  only approach it with a small radius.
- **The two upper lobes and the notch between them:** the curve must reverse
  direction near the `y` axis, which demands a loop or a sharp turn in the
  coupler curve.

Both are beyond a single four-bar, which is why the problem was posed with an
eight-bar (three dyads). The measured `11.41 mm` RMS marks the limit of that
topology within the 50–200 mm length band.

---

# 18. Cognate mechanisms

## 18.1 The Roberts–Chebyshev theorem

**Every four-bar coupler curve is produced by three different four-bars.** The
three are **cognates** of one another. Proved by Roberts (1875) and
independently by Chebyshev (1878).

## 18.2 Construction

Using the coupler triangle `A–B–P`, the cognates are built from **similar**
triangles: form a parallelogram on `O₂, A, P`, a second on `O₄, B, P`, and
locate the third fixed pivot as the apex of a triangle similar to the coupler
triangle erected on the base `O₂O₄`.

## 18.3 Why it is useful

Three mechanisms tracing the same curve have **different practical
properties**: different pivot locations, different link lengths, different
transmission angles, different interference behaviour.

So: **when you find a good curve, you get two alternative designs for free.**
If one violates your constraints, try another.

## 18.4 Cognates and synthesis

A synthesis algorithm that does not know about cognates will discover the same
curve three times and treat them as distinct solutions, giving an illusion of
diversity.

KREAMET filters by design-vector distance, which can list cognates separately.
That is a deliberate simplification: cognates really are different mechanisms
in practice (different frame layout, different assembly).

## 18.5 The construction in coordinates

Write the coupler triangle as `A`, `B`, `P` with the shape fixed by the two
ratios `|AP|/|AB|` and the included angle. The first cognate is then obtained by:

```
O₂' = O₂ + (P − A)          parallelogram on O₂, A, P
O₄' = O₄ + (P − B)          parallelogram on O₄, B, P
O₆  = apex of the triangle on O₂O₄ similar to A–B–P
```

and the third cognate follows by applying the same construction to the second.
Every cognate's coupler triangle is **similar** to the original — the same shape
at a different size and orientation — which is the geometric content of the
theorem and the reason the traced curve is identical rather than merely similar.

A useful corollary: the three cognates' fixed pivots and the coupler point form
a parallelogram at every instant. Watching that parallelogram stay closed while
the three mechanisms move is the quickest way to convince yourself the theorem
is true.

## 18.6 Cognates beyond the four-bar

Cognate relationships exist for six-bars too, though the theory is less tidy and
the number of cognates depends on the chain. There is no general theorem giving
a fixed count for an arbitrary linkage, which is one reason the search-based
approach does not attempt to exploit cognates: for the chains this application
generates, nobody knows how many there are.

That is not a gap in the tool so much as an open area. A synthesis method that
could enumerate a many-bar chain's cognates would get several alternative
designs from each search result for free, and the practical differences between
them — pivot placement, transmission angle, layer count — are exactly the
differences that decide which one gets built.

---

# 19. Dimensional synthesis — the general frame

## 19.1 Three task types

**(a) Function generation.** A prescribed relation between input and output
angles, `θ_out = f(θ_in)`.

**(b) Path generation.** A coupler point must follow a given curve; its
orientation is free.

**(c) Motion generation (rigid-body guidance).** The coupler link must pass
through given positions **and orientations**.

KREAMET is type (b): the LED must trace the heart; the angle of the link
carrying it is free.

## 19.2 Precision points

The classical approach picks `k` points on the target and requires the
mechanism to pass through them **exactly**, accepting the deviation between
them (**structural error**).

The number of free parameters limits `k`. Four-bar path synthesis has nine
independent parameters, so up to nine precision points are theoretically
possible; the equations become intractable beyond five.

## 19.3 Structural error and Chebyshev spacing

Precision points should not be equally spaced. Chebyshev spacing minimises the
maximum error:

```
x_j = ½(x_0 + x_n) − ½(x_n − x_0)·cos( (2j−1)π / (2k) )
```

Equal spacing leaves large error at the ends of the range.

## 19.4 Optimisation-based synthesis

The modern approach abandons precision points: mechanism parameters become
continuous variables, the difference between produced and target curve is
measured by an **objective function**, and that is minimised.

Advantages: no limit on precision points; kinematic constraints (Grashof,
transmission angle, singularity) and manufacturing constraints can enter the
objective directly.

Disadvantage: the space is highly multi-modal and full of local minima, so a
global search is required.

## 19.5 Designing the objective

A badly designed objective reliably takes the optimiser somewhere wrong. Three
rules.

**(1) Terms must be on comparable scales.** A curve error in millimetres
(10–100) added to a dimensionless singularity penalty (0–1) means the curve term
dominates everything. Result: mechanisms that trace a perfect heart at a `1°`
transmission angle and cannot be built. Divide each term by its characteristic
scale.

**(2) Hard constraints need bands.** A design that cannot assemble must score
strictly worse than **every** design that can; but the penalty inside the band
must still vary smoothly so the search can climb out.

**(3) Reference values must be attainable.** Referencing the singularity
penalty to `60°` when the ceiling is `44.75°` means a permanent penalty; the
optimiser chases an unreachable target and sacrifices curve fit.

## 19.6 Constraint handling

| Method | How | When |
|---|---|---|
| Penalty | Extra term in the objective | Soft constraints |
| Band separation | Penalty plus a large constant | Hard constraints |
| Parameterisation | Eliminate the constraint by geometry | Triangle inequality, rigidity |
| Repair | Project an invalid individual back | As a rescue operator |
| Rejection | Discard invalid individuals | When the feasible region is large |

**Parameterisation is always best**, because no invalid region remains in the
search space. KREAMET's `(r, α)` ternary parameterisation is an example.

**Repair must be used carefully.** In KREAMET, repairing every offspring
destroyed diversity and stalled the search (the `J` plateau sat at `4.85`);
repairing only offspring that failed to assemble brought it to `2.64`. Repair is
a **rescue** operator, not a normalisation.

---

# 20. Function synthesis and Freudenstein's equation

## 20.1 The equation

```
K₁·cos θ₄ − K₂·cos θ₂ + K₃ = cos(θ₂ − θ₄)
K₁ = d/a,   K₂ = d/c,   K₃ = (a² − b² + c² + d²)/(2ac)
```

Its beauty is that it is **linear** in `K₁, K₂, K₃`.

## 20.2 Three-position synthesis

Three `(θ₂, θ₄)` pairs give three linear equations, solved directly. Then `d`
is chosen freely (scale), `a = d/K₁`, `c = d/K₂`, and `b` follows from `K₃`.

**Exact synthesis for three positions, by linear algebra** — one of the most
elegant results in the field.

## 20.3 Four and five positions

Four positions overdetermine the three unknowns; freeing one angle (making it a
design variable) restores solvability and yields a one-parameter family. At five
positions the system becomes non-linear, typically with two solutions.

## 20.4 Range and scaling

Input and output ranges are mapped linearly onto angle ranges. Large ranges give
better resolution but worse transmission angles. `Δθ₂ ≤ 120°` and
`Δθ₄ ≤ 90°` are reasonable starting points.

## 20.5 The order problem

Synthesis does not guarantee the positions occur **in order**, nor that they lie
on the same branch. Verify by simulating a full revolution after synthesis. This
is verification work, not computation — and skipping it is a common error.

## 20.6 A worked three-position synthesis

**Given:** the output must be at `θ₄ = 30°, 60°, 100°` when the input is at
`θ₂ = 40°, 80°, 130°`.

Substituting each pair into Freudenstein's equation gives three linear equations
in `K₁, K₂, K₃`:

```
K₁·cos 30° − K₂·cos 40°  + K₃ = cos(40° − 30°)
K₁·cos 60° − K₂·cos 80°  + K₃ = cos(80° − 60°)
K₁·cos 100° − K₂·cos 130° + K₃ = cos(130° − 100°)
```

which is a 3×3 system with a well-conditioned matrix as long as the three input
angles are genuinely distinct. Solve it, choose `d` freely — the whole mechanism
scales, and the equation does not care — and read off:

```
a = d/K₁
c = d/K₂
b = sqrt( a² + c² + d² − 2·a·c·K₃ )
```

Two things can go wrong at this point and neither is visible in the algebra.
`b` under the square root can come out imaginary, meaning no four-bar realises
that relation; and the resulting linkage may need to change branch to visit the
three positions in the order asked for. Both are found by simulating, not by
solving.

## 20.7 Why linearity is worth so much

Freudenstein's equation is remarkable because the nonlinear closure condition
turns out to be **linear in a change of variables**. That is not a general
property of synthesis problems — path synthesis has no such reformulation, which
is precisely why it needs numerical search — and it means three-position
function generation is solved exactly, in microseconds, with a guarantee of
finding the solution if one exists.

The lesson generalises: before reaching for an optimiser, it is worth asking
whether the problem has a formulation in which it is linear. When it does, the
optimiser is not merely slower — it is a worse answer, because it returns *a*
solution where the linear method returns *the* solution.

---

# 21. Path synthesis

## 21.1 Free parameters

For a planar four-bar: two for each fixed pivot, three lengths, two for the
coupler point — nine in total. If the curve's position and orientation are free,
the effective count drops to six.

## 21.2 With and without prescribed timing

- **Prescribed timing:** where the point must be at each input angle. More
  constrained, harder to solve.
- **Without timing:** only the shape of the curve matters.

KREAMET synthesises without timing, which directly determines the error measure
(Chapter 24): comparison must be **curve to curve**, not point to point.

## 21.3 The optimisation approach

```
min  E(x) = curve_mismatch(P(x), target)
s.t. kinematic and manufacturing constraints
```

Critical design decisions:

- **Sampling density.** Too few samples is fast but misses fine features and
  lets the optimiser find "shortcuts". KREAMET refines `180 → 360 → 720`.
- **Alignment.** With position and orientation free, the curves must be
  optimally placed before comparison.
- **Scale.** If size is a physical requirement, alignment must **not** include
  scaling.

## 21.4 Why scaling is forbidden

The classical Procrustes alignment includes scale. In path synthesis that
silently produces wrong results: a mechanism tracing `25 × 25 mm` scales by 10×
and reports a perfect fit, when the specification asked for `250 × 250 mm`.

The correct form is **rigid alignment** — rotation and translation only — with
size measured as a separate objective term:

```
E_size = |W − W*|/W* + |H − H*|/H*
```

## 21.5 Path closure

For a closed target the mechanism's path must close: `|P(0) − P(2π)| < tol`.
In a closed-form solution this sits at machine precision; if it is large the
mechanism changed branch during the revolution. So the test is really a
**branch-continuity test**.

## 21.6 Choosing the sampling density

Sampling is not a free parameter; it is a trade between two failure modes.

**Too few samples** and the objective becomes blind to features smaller than the
spacing. Worse, it becomes *exploitable*: an optimiser will find mechanisms
whose path passes exactly through the sample points and wanders badly between
them, because that is what it was asked to do. The pathological version of this
is a path that visits the samples in a completely different order from the
target.

**Too many samples** costs time linearly with no accuracy gain once the spacing
is well below the smallest feature of the target.

The practical rule is that the sample spacing should be a few times smaller than
the smallest feature you care about — for a heart, the cusp at the top and the
point at the bottom. Refining `180 → 360 → 720` through the search gets the
speed of coarse sampling during exploration and the fidelity of fine sampling
where it matters, and the refinement schedule is worth as much attention as the
optimiser's own parameters.

## 21.7 What makes a target path hard

Not all curves are equally reachable, and it is worth knowing in advance which
kind you have:

- **Curvature reversals.** Each inflection point demands more of the mechanism.
  A convex closed curve is easy; a heart has two.
- **Cusps and corners.** A coupler curve is smooth (it is an algebraic curve),
  so a true corner is unreachable. The best a linkage does is a region of high
  curvature, and the error there will dominate the RMS.
- **Aspect ratio.** Very elongated targets need very different link lengths,
  which pushes against the length band and the transmission angle at once.
- **Size relative to the crank.** The coupler point's excursion is bounded by
  the chain's geometry; a target much larger than the mechanism can span is not
  merely hard but impossible, and no amount of search will report that clearly.

Recognising an impossible target before spending an afternoon on it is a skill
the error number does not teach. The check is geometric: compare the target's
bounding box with the reachable envelope of the coupler point at the length
limits.

---

# 22. Motion synthesis and Burmester theory

## 22.1 Poles

The transition between two planar poses can be achieved by **pure rotation**
about a point, the **pole** `P₁₂`, found as the intersection of the
perpendicular bisectors of `A₁A₂` and `B₁B₂`.

## 22.2 Two and three positions

Two positions: pick any coupler point, then any fixed pivot on the perpendicular
bisector of its two locations. Infinitely many solutions.

Three positions: the three locations of a coupler point lie on a **circle**
whose centre is the fixed pivot. Again infinitely many solutions; pick two
points to complete a four-bar.

## 22.3 Four positions and Burmester curves

At four positions an arbitrary point's four locations are generally **not**
concyclic; only special points are.

- **Circle-point curve:** the locus of coupler points whose four locations are
  concyclic.
- **Centre-point curve:** the locus of the corresponding circle centres.

Both are third-degree (circular cubic) plane curves — the **Burmester curves**
(Ludwig Burmester, 1888). Choosing two points from the circle-point curve and
their partners from the centre-point curve completes the four-bar, and the
freedom of choice is used to improve secondary criteria such as transmission
angle.

## 22.4 Five positions

At five positions the Burmester curves intersect and only finitely many
solutions remain — generally at most **four** circle points. That is the maximum
number of positions a four-bar can satisfy exactly.

| Positions | Four-bar solutions |
|---|---|
| 2 | Infinite (two-parameter family) |
| 3 | Infinite (one-parameter family) |
| 4 | Infinite (along the Burmester curves) |
| 5 | Finite (≤ 4) |
| ≥ 6 | Generally none; approximate synthesis |

## 22.5 Beyond five positions

Six or more positions generally admit no exact four-bar, so the problem becomes
approximate: minimise the deviation over all the positions rather than meet them
exactly. This is the same move as §19.4 makes for path synthesis, and it has the
same consequence — the elegant algebra is replaced by a search, and the guarantee
of finding all solutions is replaced by a guarantee of finding none of them
reliably.

The alternative is to add links. A six-bar has more free parameters and can meet
more positions exactly; the Burmester apparatus extends, at the cost of
considerably more involved algebra.

## 22.6 Motion synthesis versus path synthesis

The two are often confused and the distinction is sharp:

| | Path generation | Motion generation |
|---|---|---|
| Specified | A point's positions | A body's positions **and** orientations |
| Coupler orientation | Free | Prescribed |
| Free parameters used | Fewer constraints per position | Two constraints per position |
| Classical limit | 9 precision points (intractable past 5) | 5 positions exactly |
| Typical application | Tracing, feeding, drawing | Placing, orienting, gripping |

KREAMET is a path generator: the LED must be in the right place and the link
carrying it may be at any angle. That single freedom is worth a great deal — it
is why the error measure compares curve to curve (§24) rather than pose to pose,
and why the alignment step in §21.4 is allowed to rotate the whole path.

If the brief had asked for the LED to point outward along the heart's normal, it
would have become a motion-generation problem, the free parameters would have
been halved, and eight bars would very likely not have been enough.

---

# 23. Optimisation-based synthesis

## 23.1 The nature of the problem

Mechanism synthesis as an optimisation problem is multi-modal (dozens of local
minima, since different assembly modes open different basins), discontinuous
(feasible regions separated by non-assembling ones), constrained, and slightly
noisy (the objective shifts a little when sampling density changes). Gradient
methods alone are therefore inadequate.

## 23.2 Differential Evolution

```
for each individual x_i:
  pick three distinct: x_r1, x_r2, x_r3
  mutant  v = x_r1 + F·(x_r2 − x_r3)
  crossover: u_j = v_j if rand < CR else x_ij
  if u is better, it replaces x_i
```

Typical parameters: `F` in 0.5–0.9, `CR` in 0.7–0.95, population 5–10× the
dimension.

Variants: `rand/1/bin` (good diversity, slow), `best/1/bin` (fast, sticks in
local minima), `current-to-best/1` (a balance). KREAMET mixes `rand/1` with
`current-to-best/1` rather than committing to one exploration–exploitation
trade-off.

## 23.3 CMA-ES

Covariance Matrix Adaptation Evolution Strategy learns the shape of the search
distribution and is far more effective than DE in narrow valleys, at `O(d²)`
memory and an eigendecomposition per generation. With `d` small (15–30) it is
well suited to mechanism synthesis.

## 23.4 Local refinement

- **Nelder–Mead:** derivative-free, tolerant of noise; needs reflection or
  clipping for bounds.
- **BFGS / L-BFGS:** fast but requires gradients, which finite differences make
  unreliable on a noisy objective.
- **Powell:** direction-set, derivative-free, steadier than Nelder–Mead.

KREAMET uses bounded Nelder–Mead, because sampling introduces slight noise.

## 23.5 The seed population: constructive sampling

A random parameter vector usually will not assemble. Sampling uniformly from the
bounds makes most of the population invalid at birth, and DE goes nowhere.

**Constructive sampling** grows the mechanism dyad by dyad:

1. Choose the crank and first dyad so full rotatability holds.
2. Sweep the partial mechanism to measure the **actual anchor separation band**.
3. Choose the next dyad's bar lengths from the closed-form admissible interval
   covering that band.
4. Repeat.

Measured hit rates (KREAMET, 2000 attempts):

| Dyads | Feasible fraction |
|---|---|
| 1 | 100% |
| 2 | 66% |
| 3 | 47% |
| 4 | 47% |

With uniform random sampling these rates fall below one percent. The difference
is whether the optimisation works at all.

## 23.6 The admissible interval

Given one bar `r₁` and an anchor separation sweeping `[d_min, d_max]`, the
condition `μ ≥ μ_min` gives quadratic inequalities in `r₂` whose roots bound the
admissible interval directly. An empty set means no `r₂` works for that `r₁` —
which is exactly why the input dyad operates in such a narrow band.

## 23.7 Progressive refinement

Objective cost is linear in sample count, so early generations use coarse
sampling: `180 → 360 → 720` frames per revolution.

The caveat: coarse sampling misses fine features and lets the search find
shortcuts. Final ranking must **always** be at the finest sampling, or the
number you report is not the number the optimiser minimised.

## 23.8 Diversity and multiple solutions

One best solution is not enough: practical constraints (mounting space,
interference, aesthetics) may appear later. Keep the best `K` and filter
duplicates by design-vector distance, choosing the threshold carefully — too
small fills the list with copies, too large discards real alternatives.

## 23.9 Multi-objective approaches

Instead of a weighted sum, a **Pareto front** exposes the trade-off between
curve error and transmission angle. NSGA-II is standard. The advantage is that
no weights must be chosen; the disadvantage is that the user must still choose
in the end, and the front becomes hard to read in higher dimensions.

KREAMET uses a weighted sum but **displays the term breakdown**, so the score is
not a black box and the weights can be edited.

---

# 24. Curve comparison measures

## 24.1 Point-to-point (parametric) error

```
E = sqrt( (1/n) · Σ |P_i − Q_i|² )
```

Depends on parameterisation: two mechanisms tracing the same curve at different
speeds score badly even though they are geometrically identical. Misleading for
synthesis without timing — but it does carry information about the speed
distribution along the curve, which KREAMET reports as a secondary measure.

## 24.2 Chamfer distance

Distance from each point to the nearest point on the other curve:

```
E_{P→Q} = sqrt( (1/n) Σ_i d(P_i, Q)² )
```

**One-sided Chamfer is not enough:** a mechanism whose path covers only a small
part of the target scores perfectly. The **symmetric** form fixes this:

```
E = sqrt( ½ (E²_{P→Q} + E²_{Q→P}) )
```

The `Q→P` direction penalises the parts of the target that are not covered, so
the symmetric form is mandatory.

## 24.3 Point-to-segment distance

Point-to-point distance between sampled curves creates an error floor that
depends on sample density. Measuring to the nearest **segment** removes it:

```
t = clamp( ((P−A)·(B−A)) / |B−A|², 0, 1 )
d = |P − (A + t·(B−A))|
```

This gives the same accuracy with roughly a quarter of the samples.

## 24.4 Spatial indexing

Naive Chamfer is `O(n·m)` — 518 400 distance computations per evaluation for
`n = m = 720`. A **uniform grid** index brings it close to `O(n)`: place the
target in a grid whose cell size is about the mean sample spacing, then search
the query point's cell and expanding rings, stopping when the best distance
found is smaller than the ring radius.

## 24.5 Hausdorff distance

```
H(P,Q) = max( max_i d(P_i,Q), max_j d(Q_j,P) )
```

A worst-case measure; too rigid for optimisation (no gradient information) but
valuable for **reporting** — "largest deviation" is a number a user understands.

## 24.6 Alignment by circular cross-correlation

Before comparing, the target must be placed optimally on the produced curve. For
a rigid transform:

1. **Centre both curves** on their centroids.
2. **Optimal rotation** in the complex plane: `θ* = arg( Σ_k p_k · conj(q_k) )`.
   This is the planar Kabsch/Procrustes solution and is **closed-form**.
3. **Phase shift.** The starting point of a closed curve is arbitrary; all
   shifts are evaluated by FFT in `O(n log n)`, taking the largest `|c[s]|`.
4. **Direction.** The curve may be traversed the other way; try both.

The optimal (shift, direction, rotation, translation) is found **exactly**, with
no optimisation.

## 24.7 Comparison of measures

| Measure | Parameterisation-free | Penalises non-coverage | Cost | Use |
|---|---|---|---|---|
| Point-to-point | No | Partly | `O(n)` | Timed synthesis |
| One-sided Chamfer | Yes | **No** | `O(n log n)` | Do not use |
| Symmetric Chamfer | Yes | Yes | `O(n log n)` | Path synthesis |
| Hausdorff | Yes | Yes | `O(n log n)` | Reporting |
| Fourier | Yes | Partly | `O(n log n)` | Pre-screening, atlases |
| Area difference | Yes | Yes | `O(n)` | Coarse measure |

## 24.8 Fourier descriptors

Treat the closed curve as a complex periodic signal `z(t) = x(t) + i·y(t)` and
take its Fourier coefficients. Then:

```
translation  → changes only c₀
scale        → multiplies every cₖ by the same factor
rotation     → multiplies every cₖ by the same unit phase
start point  → multiplies cₖ by a phase linear in k
```

Each nuisance transform touches the coefficients in a structured way, so
normalising them out is arithmetic rather than search: divide through by `|c₁|`
for scale, rotate so `c₁` is real, drop `c₀`. What remains is a signature that
depends on the *shape* alone.

The value is speed. Comparing two curves becomes comparing a few dozen numbers
rather than a few hundred point-to-segment distances, which is why the classical
coupler-curve atlases were indexed this way and why Fourier screening is still
the right first pass over a large population.

The limit is that truncating the series smooths the curve, so two shapes that
differ only in a sharp local feature — exactly the cusp of a heart — can have
nearly identical low-order descriptors. Fourier is a screen, not a verdict.

## 24.9 Choosing a measure, in practice

The measure is not a detail of the implementation; it *is* the specification of
what "a good mechanism" means, and every pathology in a synthesis result can be
traced back to it. Three that recur:

**Coverage.** If the measure does not penalise missing part of the target, the
optimiser will miss part of the target. This is not a hypothetical: one-sided
Chamfer plus a curve that traces one lobe of a heart is a global optimum of the
stated problem.

**Scale.** If the alignment is allowed to scale, size stops being a requirement
and becomes a free variable. A `25 × 25 mm` mechanism reports a perfect fit to a
`250 × 250 mm` target, and nothing in the number says so.

**Parameterisation.** If the measure is point-to-point when timing is free, two
geometrically identical mechanisms score differently for tracing the same curve
at different speeds, and the search wastes its budget on a distinction nobody
asked about.

The general form of the advice: **write down what would count as cheating, then
check that the measure forbids it.** An objective is a contract with an
adversary who reads it literally.

---

# 25. Mass, inertia and centre of gravity

## 25.1 Mass models

**(a) Point mass.** All mass at the centre of gravity, inertia ignored. Too
coarse except for a first estimate.

**(b) Line density.** The body is treated as constant-section bars, so mass is
proportional to length: `m = ρ_line · L`, with `ρ_line` in kg/mm. Quite accurate
for laser-cut or 3D-printed parts of constant section.

**(c) Solid model.** Computed from real geometry in CAD. Most accurate, most
expensive.

KREAMET uses (b), because during synthesis the body geometry has not been
designed yet — only joint positions are known. Mass proportional to length is
the most honest model available at that stage and is adequate for **relative**
comparison.

There is a general principle here worth stating plainly: **the fidelity of the
mass model should match the fidelity of the geometry**. Running a solid-model
inertia calculation on a link whose cross-section has not been chosen is
precision applied to an assumption, and precision applied to an assumption
produces confident wrong answers rather than honest uncertain ones.

## 25.2 Centre of gravity and inertia

For a uniform binary link, `c = (A + B)/2`. For a composite body, take the
mass-weighted mean of the parts:

```
c = ( Σ m_i · c_i ) / ( Σ m_i )
```

For a thin rod of length `L` and mass `m` about its own centre:

```
I_c = m·L² / 12
```

and the parallel axis theorem moves it: `I_P = I_c + m·d²`.

Two standard results follow and are worth memorising, because they come up
constantly in linkage work:

```
thin rod about its centre  I = mL²/12
thin rod about one end     I = mL²/3     (= mL²/12 + m(L/2)²)
point mass at radius r     I = m·r²
```

The rod-about-its-end value is four times the rod-about-its-centre value. That
factor of four is why moving a pivot from the middle of a link to its end is a
significant dynamic change, not a detail.

## 25.3 Ternary and composite links

A ternary link is not a rod. Model it as a set of rods, or as a plate, and
compose:

```
m     = Σ m_i
c     = ( Σ m_i · c_i ) / m
I_c   = Σ ( I_ci + m_i · |c_i − c|² )
```

The composition step — parallel-axis each part to the *composite* centre before
summing — is where errors creep in. A quick check: `I_c` computed this way must
be smaller than `I` about any other point of the body, because the centroid
minimises the second moment. If a refactor makes `I_c` the largest number in
the table, the parallel-axis term has picked up the wrong sign or the wrong
reference point.

## 25.4 Units

Kinematics works in millimetres, dynamics in SI. Mixing them is the most common
error class: entering millimetres into `I = m·L²/12` inflates the result by
`1e6`. Passing every conversion through one module (`utils/units.ts` here)
eliminates the class entirely.

`1e6` is a distinctive signature, and it is worth knowing what wrong answers
look like:

| Symptom | Likely cause |
|---|---|
| Inertia `1e6` too large | Length left in mm inside an SI formula |
| Torque `1e3` too large | One length converted, one not |
| Energy exactly `1e6` out | `I` wrong, `ω` right |
| Everything `9.81×` out | `g` applied twice, or omitted where assumed |

An order-of-magnitude sanity check on a single number catches all of these in
seconds, and no amount of careful algebra catches any of them.

## 25.5 Reduced (effective) inertia

In a 1-DOF mechanism all motion is parameterised by `θ`. The kinetic energy
becomes:

```
T = ½ · M(θ) · θ̇²
M(θ) = Σ ( m_i · |∂p_i/∂θ|² + I_i · (∂φ_i/∂θ)² )
```

`M(θ)` is the **reduced inertia**: the whole mechanism's equivalent inertia as
seen at the motor shaft. It depends on configuration, and it is the single most
important concept in 1-DOF mechanism dynamics.

Read the formula physically. Each body contributes twice: once for how fast its
centre moves per unit of crank rotation (`|∂p/∂θ|²`), and once for how fast it
spins per unit of crank rotation (`(∂φ/∂θ)²`). Both are **squared**, so a body
that moves twice as fast per unit input contributes four times the inertia. A
link near the output of a long chain, where small crank motions produce large
displacements, can dominate `M(θ)` while being one of the lightest parts in the
mechanism.

The derivatives are taken by finite differences — with branch seeding, or the
result is meaningless. This is not a small caveat: an unseeded finite difference
that happens to straddle a branch flip produces a `∂p/∂θ` of enormous magnitude,
and the resulting `M(θ)` spike looks exactly like a real dynamic feature.

## 25.6 Reading the shape of `M(θ)`

A large variation in `M(θ)` means the motor must supply a varying torque even at
constant speed, which produces vibration and, at the wrong frequency, resonance.
Useful summary numbers:

```
M_mean = (1/2π) ∫ M(θ) dθ
ripple = (M_max − M_min) / M_mean
```

A ripple under about `0.2` is comfortable; above `1.0` the mechanism is
effectively a variable-inertia machine and needs either a flywheel (§28.3) or a
speed controller that anticipates the variation rather than reacting to it.

`M(θ)` also has a characteristic period. For a crank-driven mechanism it is
usually dominated by the second harmonic — inertia peaks twice per revolution,
once for each extended configuration — which is why balance shafts in engines
run at twice crankshaft speed (§30).

---

# 26. Static force analysis

## 26.1 Free-body equations

Per link, `ΣF = 0` and `ΣM = 0` — three equations in the plane. For a 1-DOF
mechanism the count works out exactly: `3(n−1) = 2j + 1`, matching the joint
reactions plus the input torque. That is the static counterpart of the mobility
formula and a pleasant consistency check.

It is worth verifying on the shipped 8-bar: `3(8−1) = 21` equations against
`2(10) + 1 = 21` unknowns — ten revolute pairs at two reaction components each,
plus the input torque. Square system, unique solution. If that count ever comes
out non-square, either the mobility is not 1 or a joint has been miscounted, and
the statics has found a topology error that the kinematics did not.

## 26.2 Two-force members

A link with only two joints and no external load carries force along the line
joining them. This simplifies analysis greatly: the **direction** is known and
only the magnitude is sought. In a four-bar the coupler is usually a two-force
member.

The proof is one line: with only two forces and no couple, `ΣM = 0` about
either joint forces the other force's line of action through that joint, so both
forces lie along the joint-to-joint line and are equal and opposite.

This is why the transmission angle is defined where it is (§15). At a two-force
member the force direction is a property of the *geometry alone*, so the angle
between that direction and the output link's velocity is the whole story about
force transmission — no free-body diagram needed.

A link stops being a two-force member the moment it carries a distributed load,
which for a linkage in gravity means **always, strictly speaking**. The
approximation is good when the weight is small next to the transmitted force,
which is the usual case, and poor for a slow, heavy mechanism — exactly the case
where gravity torque matters most.

## 26.3 Virtual work

For a 1-DOF mechanism all virtual displacements are proportional to `δθ`, so:

```
T_in = − Σ ( F_i · ∂p_i/∂θ + M_i · ∂φ_i/∂θ )
```

No joint forces are computed at all. For motor selection this is all you need.

The economy here is dramatic and worth appreciating: a full free-body solution
for the 8-bar is a 21×21 linear system per frame, assembled from geometry that
changes every frame. Virtual work replaces it with a dot product over eight
bodies. For 720 frames × 6000 candidate designs, that difference is the
difference between a search that runs and a search that does not.

The catch is that virtual work gives you **only** the input torque. It cannot
tell you what any bearing is carrying. The two methods answer different
questions and a complete design needs both — just not at the same stage.

## 26.4 Gravity torque

With `F_i = m_i·g` and `g = (0, −9.80665)` m/s²:

```
U(θ) = Σ m_i · g · h_i(θ)
T_gravity = dU/dθ
```

where `h_i` is the height of body `i`'s centre of gravity. Note that `U` is
defined up to an additive constant — the choice of datum is arbitrary and
cancels in the derivative, so any consistent datum will do.

## 26.5 The closed-loop integral is zero

`U(θ)` is single-valued on a closed path, so:

```
∮ (dU/dθ) dθ = U(2π) − U(0) = 0
```

Gravity does zero net work over a revolution. This is a very useful check: if
your `dU/dθ` is wrong, the integral will not vanish. KREAMET's test suite
asserts `|∫| < 1e−3`.

The check is strong because it is **global**. A sign error on one body, a wrong
lever arm, a branch flip halfway round — all of them break the identity, and
none of them is visible in a single-frame inspection where every number looks
plausible.

It is also worth knowing what it does *not* catch: an error that is itself
periodic and odd about the revolution integrates to zero too. Pair it with the
finite-difference check below, which is local, and between them very little
gets through.

## 26.6 Finite-difference verification

A second, independent check compares the analytic (virtual work) result against
a direct finite difference of `U`, requiring agreement to about `1e−6`. Both
tests passing is strong evidence that the dynamics layer is correct.

The independence is the point. Virtual work differentiates the *geometry* and
sums forces; the finite difference evaluates `U` at two nearby angles and
subtracts. They share the position solver and nothing else, so agreement to six
digits is not a coincidence that a common bug could produce.

Choose the step with care: too large and truncation error dominates, too small
and cancellation does. For a smooth `U` in double precision, a central
difference with `h ≈ 1e−5` rad lands near the minimum of the combined error,
which is why the tolerance is `1e−6` rather than machine epsilon.

## 26.7 Joint reactions

Bearing selection needs reaction forces, obtained by solving link by link from
output to input. The maximum reaction usually occurs where the **transmission
angle is worst** — forces blow up near singularity. That is the direct link
between the `μ` lower bound and bearing life.

Quantitatively, for a dyad the joint force scales as roughly `1/sin μ`:

| `μ` | Force multiplier |
|---|---|
| 90° | 1.00 |
| 60° | 1.15 |
| 45° | 1.41 |
| 30° | 2.00 |
| 20° | 2.92 |
| 10° | 5.76 |

And since bearing life goes as the cube of load (§31), the `μ = 20°` design is
not `2.9×` worse than the `μ = 90°` one — it is `2.9³ ≈ 25×` worse in hours.
That is the number to quote when somebody proposes accepting a poor
transmission angle to gain half a millimetre of path accuracy.

---

# 27. Dynamics: Newton–Euler

## 27.1 The equations

Per link: `ΣF = m·a_c` and `ΣM_c = I_c·α`.

Solution order: solve the kinematics first (position, velocity, acceleration),
compute the inertia terms, then balance link by link from output to input; the
torque left at the input link is what the motor must supply.

The order matters and is not negotiable: the inertia terms depend on
accelerations, which depend on the full kinematic solution, which is
independent of the forces. Kinematics first, always — a "dynamic simulation"
that solves them simultaneously is doing unnecessary work for a rigid
mechanism.

## 27.2 d'Alembert's principle

**d'Alembert's principle** turns this into a statics problem by adding
`F_inertia = −m·a_c` and `M_inertia = −I_c·α` as external loads, which lets the
static methods be used directly.

The reframing is more than a trick. Once the inertia forces are on the
free-body diagram, everything from §26 applies unchanged: two-force members,
virtual work, the transmission-angle argument. It is the reason the same
graphical methods that served static linkage design for a century transferred
to dynamic design without modification.

## 27.3 What it costs and what it gives

Newton–Euler gives all joint reactions — necessary for bearings, pins and body
strength — but requires assembling and solving a system. If only motor torque is
wanted, Lagrange's method is far shorter.

| | Newton–Euler | Lagrange |
|---|---|---|
| Joint reactions | Yes | No |
| Motor torque | Yes | Yes |
| Cost per frame | Solve `3(n−1)` equations | One sum |
| Sensitive to sign conventions | Very | Moderately |
| Good for | Detail design, bearing sizing | Synthesis, motor sizing |

The practical division of labour: **Lagrange during synthesis** (thousands of
candidates, only the torque matters), **Newton–Euler once at the end** (one
design, every reaction matters). Building both and using each where it belongs
is cheaper than compromising on one.

## 27.4 A note on accuracy

Both methods are exact for rigid bodies; they differ in numerical behaviour, not
in physics. Newton–Euler's linear system can be ill-conditioned near a
singularity — the same geometric degeneracy that makes reactions large makes the
matrix nearly singular — so a reaction computed at `μ = 5°` should be treated as
an order of magnitude, not a number. Lagrange's scalar sum has no such
conditioning problem, which is another reason it is the right tool inside an
optimiser that will inevitably visit bad configurations.

---

# 28. Dynamics: Lagrange and reduced inertia

## 28.1 The 1-DOF equation

```
L = T − U,   T = ½·M(θ)·θ̇²
Q = M(θ)·θ̈ + ½·M'(θ)·θ̇² + U'(θ)
```

| Term | Name | Dominant when |
|---|---|---|
| `M(θ)·θ̈` | Inertia torque | Accelerating or decelerating |
| `½·M'(θ)·θ̇²` | Centripetal-like | High constant speed |
| `U'(θ)` | Gravity torque | Low speed, heavy bodies |

The derivation is worth seeing once, because the middle term is where people go
wrong. From `d/dt(∂L/∂θ̇) − ∂L/∂θ = Q` with `T = ½M(θ)θ̇²`:

```
∂L/∂θ̇ = M(θ)·θ̇
d/dt(M·θ̇) = M·θ̈ + M'·θ̇²          ← chain rule: M depends on θ, θ on t
∂L/∂θ  = ½·M'·θ̇² − U'
Q = M·θ̈ + M'·θ̇² − ½·M'·θ̇² + U'
  = M·θ̈ + ½·M'·θ̇² + U'
```

The `½` survives because the same `M'θ̇²` appears twice with different
coefficients and partially cancels. Dropping either occurrence gives a term
twice too large or a term that vanishes — both are common errors, and both look
superficially reasonable.

## 28.2 The second term matters

`½·M'(θ)·θ̇²` is frequently omitted, which is badly wrong for mechanisms running
at constant speed. At constant speed `θ̈ = 0` and the first term vanishes — yet
the motor must still apply torque, because the reduced inertia is changing.

Physically: as the mechanism "opens", inertia rises and energy must be supplied
to hold speed; as it "closes", inertia falls and energy comes back. Over a full
revolution the net is zero — `M(θ)` is periodic, so `∮ ½M'θ̇² dθ = 0` at constant
speed — but the *instantaneous* torque swings hard either way, and it is the
instantaneous value that sizes the motor and shakes the frame.

§40.7 works this through numerically and shows the term going from an 8% ripple
at 60 rpm to eight times the gravity torque at 600 rpm. Both figures come from
the same mechanism.

## 28.3 Flywheel sizing

```
I_flywheel = ΔE_max / (C_s · ω_mean²)
```

with `ΔE_max` the largest energy excess in a revolution and `C_s` the accepted
speed fluctuation coefficient (typically 0.02–0.05).

`ΔE_max` is found by integrating the torque excess over the revolution and
taking the largest peak-to-trough swing of the running total — not by taking the
peak torque, which is a common and expensive mistake. Two mechanisms with the
same peak torque can need flywheels differing by an order of magnitude,
depending on how long the excess lasts.

Note the `ω²`: a flywheel at twice the speed is four times as effective for the
same inertia. Where a gearbox is present, putting the flywheel on the **fast**
side is nearly always right.

## 28.4 Motor selection

The motor must supply the peak torque `max|Q(θ)|`, the RMS torque (which sets
heating), and the peak power `max|Q·ω|`. With a gearbox of ratio `i`, reduced
inertia at the motor divides by `i²` and torque by `i`; the optimal ratio is
near `i_opt ≈ sqrt(M_load / I_motor)`.

That optimum is worth understanding rather than memorising. Too low a ratio and
the motor fights the load's inertia directly; too high and it mostly accelerates
its own rotor through the gearing. The minimum sits where the reflected load
inertia equals the motor inertia — the classic **inertia matching** result — and
it is quite flat, so anything within a factor of two of `i_opt` is fine.

Three numbers, three different failure modes:

- **Peak torque** exceeded → the mechanism stalls at one point in the cycle.
- **RMS torque** exceeded → it runs, then overheats twenty minutes later.
- **Peak power** exceeded → the drive current-limits and the speed sags.

A motor chosen on peak torque alone passes the demonstration and fails the
duty cycle.

KREAMET computes the three Lagrange terms separately and displays them
separately: knowing which term dominates decides whether the answer is a
flywheel, a counterweight or a lighter body.

---

# 29. Gravity torque and balancing

## 29.1 What balancing means

A mechanism is **statically balanced** if `U(θ)` is constant, so `dU/dθ = 0`
everywhere; the motor then only has to overcome inertia and friction. A
perfectly balanced mechanism stays wherever you leave it, at every position —
which is both the definition and the shop-floor test.

## 29.2 Methods

- **Counterweights.** Simple, but they raise total mass and therefore inertia,
  worsening dynamic loads. The trade is direct: static torque improves as `m`,
  dynamic load worsens as `m`, so counterweighting is a good deal at low speed
  and a bad one at high speed.
- **Spring balancing.** A **zero-free-length spring** has `U = ½k|r|²` and can
  cancel gravitational potential exactly, with no added mass. Preferred in
  robotics and rehabilitation devices. Zero-free-length behaviour is obtained in
  practice by routing a real spring over a pulley or anchoring it beyond its own
  mounting point, not by finding a spring with no free length.
- **Parallelogram linkages.** Keep a link's orientation fixed and allow a
  counterweight to be placed far away — which multiplies its effect by the
  distance and lets a small mass do the work of a large one close in.

## 29.3 Why exact balance is rarely worth it

**Partial balancing** is usually the practical choice: adding 10–20% of the mass
typically removes 60–80% of the peak torque. The reason is the shape of the
trade — the first counterweight cancels the largest harmonic of `U(θ)`, and
harmonics fall off quickly, so the second and third counterweights buy much less
for the same mass penalty.

Exact static balance also fixes the mechanism at one orientation of gravity. A
device that gets tilted, mounted differently, or carried is balanced for a
condition it is no longer in, and it now carries the mass penalty with none of
the benefit.

## 29.4 In this application

KREAMET measures the peak `|dU/dθ|` over the revolution and includes it with a
deliberately small weight (`0.05`). At this scale (150–250 mm, a few hundred
grams) gravity torque is a small effect and should not dominate the design; it
is measured so that, between two kinematically equal designs, the one needing
less torque wins. The measured peak for the shipped design is `0.24 N·m`.

The weight is a statement about what matters, and choosing it is a design
decision rather than a tuning parameter. Set it high and the optimiser will
happily trade away path accuracy and transmission angle for a gram-centimetre of
balance that nobody asked for. A term should carry weight in proportion to how
much the answer should depend on it — which for a small, slow, tabletop
mechanism means gravity is a tie-breaker, not a driver.

---

# 30. Mass balancing (shaking force and moment)

## 30.1 What the frame feels

Moving masses transmit oscillating force and moment to the frame:

```
F_shaking = Σ m_i · a_ci
M_shaking = Σ ( I_i·α_i + r_i × m_i·a_ci )
```

This is Newton's third law seen from the outside: whatever accelerates the
links is reacted through the bearings into the frame, and from there into the
bench, the floor and everything bolted to them. A mechanism that runs beautifully
on paper can be unusable because it walks across a table.

## 30.2 Force balance

**Full force balance** requires the total centre of gravity to stay fixed. The
Berkof–Lowen method gives counterweight masses and positions in closed form for
a four-bar. The cost is heavy: added mass is typically 2–4× the original, so
total inertia and motor torque rise.

The condition is easy to state and instructive: if `Σ m_i · c_i(θ)` is constant
in `θ`, its second derivative is zero, so `Σ m_i · a_ci = 0` and the shaking
force vanishes identically — at every speed, without any assumption about how
fast the mechanism runs. Force balance is a *geometric* property, which is why it
can be solved in closed form at all.

## 30.3 Moment balance

**Moment balance** requires more: a counter-rotating inertia disc, a second
mirror-symmetric mechanism (the cleanest solution — the two cancel each other),
or a geared balance shaft.

The mirrored-pair solution deserves emphasis. Two identical mechanisms running
in antiphase cancel both force and moment exactly, need no tuning, and stay
balanced if the design changes — because whatever changes, changes in both. It
costs a duplicate mechanism, which sounds expensive until it is compared with
the mass of a full Berkof–Lowen counterweight set plus a balance shaft.

## 30.4 What is actually done

In industry full balancing is rare. The usual route is partial balancing to
remove 70–80% of the shaking force, isolation for the remainder, and staying
away from critical speeds.

Harmonic analysis helps: expand the shaking force as a Fourier series in the
crank angle. The first harmonic is usually largest and can be cancelled with one
counterweight on the crank; the second requires a balancer running at twice the
speed, as in internal-combustion engines. Higher harmonics are normally left to
isolation, because the balancer for harmonic `n` runs at `n×` speed and its own
bearing problems grow faster than the vibration it removes.

## 30.5 Balancing and this project

For a slow, light, tabletop mechanism, shaking force is not a design driver —
the whole moving assembly weighs a few hundred grams and turns at tens of rpm,
so the forces involved are grams-force. The reason to understand the topic
anyway is that it sets the boundary of the current model: nothing in KREAMET's
objective penalises an unbalanced design, and if the same synthesis were pointed
at a machine running at 3000 rpm, that omission would be the first thing to fix.

Knowing what a tool does not model is part of knowing how to use it.

---

# 31. Friction, efficiency and bearings

## 31.1 Joint friction

Joint friction torque is `M_f = μ_s · R_bearing · F_reaction`.

| Bearing type | `μ_s` |
|---|---|
| Dry plastic on steel | 0.15–0.30 |
| Lubricated bronze bush | 0.05–0.12 |
| Ball bearing | 0.001–0.005 |
| Needle bearing | 0.002–0.006 |

Note the two orders of magnitude between a dry plastic bush and a ball bearing.
For a 3D-printed prototype running on printed pins — which is what most of these
mechanisms are first built as — the top row is the relevant one, and friction is
not a small correction to the torque budget but a comparable term to gravity.

## 31.2 Efficiency by joint type

Efficiency is high with revolute joints (90–98%), lower with sliders (70–90%),
and can be very low with screws (20–50%), where self-locking occurs.

Self-locking is worth a word, because it is sometimes a feature. A screw whose
lead angle is below the friction angle cannot be back-driven: the load cannot
turn the screw, only the screw can move the load. That makes a terrible
transmission and an excellent holding device, which is why jacks and vices use
exactly that geometry deliberately.

## 31.3 Friction and the transmission angle

Because joint force grows as `1/sin(μ)`, so does friction torque: `μ = 45°`
costs `1.41×` relative to `90°`, and `μ = 20°` costs `2.9×`. That is the
efficiency argument for the transmission-angle limit.

The compounding is what makes it serious. A poor transmission angle raises the
joint force; the raised force raises the friction torque; the friction torque
raises the required input force; and the required input force raises the joint
force again. In a chain of several dyads each running near its limit, the losses
multiply rather than add, and a mechanism with four joints at 90% each keeps
`0.9⁴ = 66%` of its input.

## 31.4 Efficiency of a chain

```
η_total = Π η_i
```

For a chain of `k` dyads at efficiency `η` each, total efficiency is `η^(2k)` —
two joints per dyad. This is the quiet argument *against* using more links than
the path requires, and a counterweight to §J's freedom to add bars: every dyad
added to reduce path error also costs efficiency, adds two more bearings to
manufacture, and adds two more clearances to the error chain (§37).

More links is not free. It is a purchase, and the currency is efficiency,
precision and cost.

## 31.5 Bearing life

Bearing life follows `L₁₀ = (C/P)³ · 10⁶` revolutions for ball bearings, with
the cubic-mean load used when `P` varies through the revolution:

```
P_m = ( (1/N) Σ P_i³ )^(1/3)
```

The cube is the important part. Halving the load gives **eight times** the life;
a 25% overload costs about half of it. This is why §26.7's transmission-angle
argument ends in bearing hours rather than newtons — a design decision that
looks like a 3× force penalty is a 25× life penalty, and 25× is the difference
between a machine serviced yearly and one serviced fortnightly.

For plain bushes the exponent is different and the failure mode is wear rather
than fatigue, but the direction of the argument is the same.

---

# 32. Cam mechanisms

## 32.1 When to use a cam

Linkages produce analytic motion and cannot deliver **every** motion law. A cam
is cut directly to the law, giving exact dwells, asymmetric acceleration
profiles and arbitrary position–time relations. The price is higher-pair
contact: Hertzian stress, wear, and one-directional force (needing a spring or a
grooved cam for the return).

The decision is usually settled by one question: **is the required motion law
negotiable?** If the machine needs "roughly this path, smoothly", a linkage is
better in every respect that matters. If it needs "stationary for exactly 90°,
then this exact acceleration profile", no linkage will do it and the wear is the
price of admission.

## 32.2 Motion laws

| Law | `a_max` | Jerk | Note |
|---|---|---|---|
| Constant velocity | ∞ | ∞ | Impact at the ends; unusable |
| Parabolic | `4h/β²` | ∞ | Discontinuous jerk |
| Simple harmonic | `π²h/(2β²)` | ∞ | Jerk jumps against a dwell |
| Cycloidal | `2πh/β²` | Continuous | Most common |
| Modified trapezoid | `4.89h/β²` | Continuous | Lowest peak acceleration |
| Polynomial 3-4-5 | `5.77h/β²` | Continuous | Full control of end conditions |

Cycloidal: `s(θ) = h·( θ/β − sin(2πθ/β)/(2π) )`.
Polynomial 3-4-5 with `x = θ/β`: `s(x) = h·(10x³ − 15x⁴ + 6x⁵)`.

**The essential rule:** acceleration must be continuous where a dwell meets
motion, or infinite jerk results and the mechanism rings. Parabolic and simple
harmonic laws violate this; cycloidal and polynomial laws do not. It is the most
commonly broken rule in cam design and the main cause of noisy machinery.

## 32.3 Why jerk matters

Jerk — the derivative of acceleration — is not an aesthetic concern. A step in
acceleration means a step in force, and a step in force excites every natural
frequency of the follower train at once. The follower then oscillates about the
intended motion at its own resonance, and what was designed as a smooth lift
arrives as a lift plus a decaying ring.

The practical consequences are audible and measurable: noise, contact stress
peaks well above the nominal Hertzian value, follower bounce at speed, and
fatigue in the return spring. Doubling the speed quadruples the acceleration and
therefore the amplitude of the ringing — which is why a cam that is quiet on a
test bench can be unusable in production.

The rule generalises beyond cams. Any motion specification that is `C¹` but not
`C²` at a boundary has the same problem, including a linkage synthesis whose
target path is specified as line segments meeting at corners.

## 32.4 Pressure angle and curvature

```
tan(α) = (ds/dθ) / (r_prime + s)
```

Keep `α ≤ 30°` for a translating follower. Reduce it by enlarging the base
circle, at the cost of a bigger cam and higher surface speed.

The pressure angle is the cam's exact analogue of the linkage's transmission
angle, and the two are complementary: `α` is measured from the common normal,
`μ` from the link, so a *small* pressure angle and a *large* transmission angle
are both the good case. Everything §15 says about force transmission,
bearing loads and sensitivity carries over directly.

The profile's radius of curvature must exceed the follower roller radius, or
**undercutting** occurs and the follower cannot track the intended motion:

```
ρ_min > r_roller       (convex regions)
```

Undercutting is a geometric impossibility, not an inaccuracy: the cutter
physically removes material the profile needs. It cannot be corrected by
finishing, only by a larger base circle or a smaller roller.

## 32.5 Cam or linkage

| Criterion | Cam | Linkage |
|---|---|---|
| Freedom of motion law | Total | Limited (analytic curves) |
| Exact dwell | Easy | Approximate (six-bar) |
| Wear | High | Low |
| Speed capability | Moderate | High |
| Manufacture | CNC required | Hole and pin suffice |
| Load capacity | Limited (Hertz) | High |
| Cost to change the motion | Recut the cam | Re-synthesise, reprint |
| Failure mode | Gradual wear, then jump | Bearing wear, backlash |

KREAMET's problem is specified **cam-free** — a deliberate choice favouring wear
resistance and speed capability, and the main constraint that makes the design
hard. Cam-free plus single-motor is what turns this from a fabrication exercise
into a synthesis problem: without those two constraints, drawing a heart is a
solved and uninteresting task.

---

# 33. Gears and gear trains

## 33.1 The fundamental law of gearing

The fundamental law of gearing requires the common normal at the contact point
to pass always through the pitch point. Anything else means the velocity ratio
varies within a tooth engagement, which is a vibration source at tooth-passing
frequency.

The profile family that achieves this is the **involute**, whose decisive
advantage is **centre-distance tolerance**: the ratio is unaffected if the
centres shift slightly. This is why involute gearing displaced the cycloidal
profiles that preceded it. A cycloidal pair transmits perfectly at its nominal
centre distance and imperfectly at any other; an involute pair transmits
perfectly at *every* centre distance, with only the pressure angle and backlash
changing. Given real bearings, real housings and real thermal growth, that
property is worth more than any efficiency difference.

## 33.2 Basic quantities

```
m   = d / z          module (mm)
p   = π·m            pitch
d_b = d·cos(α)       base circle
d_a = d + 2m         addendum circle
d_f = d − 2.5m       dedendum circle
a   = (d₁ + d₂)/2    centre distance
```

with a standard pressure angle `α = 20°`.

The module is the size parameter: two gears mesh only if they share a module and
a pressure angle. Tooth counts set the ratio, the module sets the physical size,
and the two are independent — a useful separation when a ratio is fixed by
kinematics and the size by the space available.

The **contact ratio** `ε` must exceed 1, or motion is interrupted; `ε ≥ 1.4` is
targeted in practice, so that at least one tooth pair is always fully engaged
and often two share the load. The minimum tooth count without undercutting is
`z_min = 2/sin²(α) = 17` at `20°`, relaxed by profile shift.

## 33.3 Gear trains

- **Simple:** `i = z_out / z_in`; idlers change direction only, never the ratio.
- **Compound:** `i = (z₂·z₄)/(z₁·z₃)`, needed for ratios above about 10 —
  a single stage past that needs an impractically large wheel.
- **Epicyclic:** Willis's equation
  `(ω_sun − ω_carrier)/(ω_ring − ω_carrier) = −z_ring/z_sun`, giving very high
  ratios in a compact, coaxial package.

Willis's equation is easiest to use as written: it is an ordinary gear ratio
*measured in the rotating frame of the carrier*, which is exactly what the
subtractions accomplish. Fix any one member, and the equation gives the ratio
between the other two.

## 33.4 Gears in mechanism design

In mechanism design gears appear in three roles:

**(1) Reduction.** Matching a fast, low-torque motor to a slow, high-torque
mechanism. §28.4's inertia-matching argument sets the ratio.

**(2) Phase locking.** Two mechanisms that must stay in a fixed angular
relationship — a mirrored pair for balancing (§30.3), a pair of cranks driving a
common load — are geared together rather than trusted to two synchronised
motors. The gear train enforces the relationship mechanically, and a mechanical
constraint cannot lose synchronisation.

**(3) Gear-driven linkages.** The most interesting role. A five-bar has `M = 2`,
but coupling its two inputs through a gear pair makes it `M = 1` with a far
richer curve family than a four-bar. The gear ratio becomes a design parameter
alongside the link lengths, and non-integer ratios give curves that close only
after several revolutions.

This last construction is the main alternative to a long single-loop chain for
path generation, and it is worth knowing why it was not chosen here: it
reintroduces a higher pair, with the wear and backlash that the cam-free
requirement exists to avoid. The trade is genuine — geared five-bars reach
paths that a pure linkage of comparable size cannot — but it is a different
brief.

---

# 34. Spatial and spherical mechanisms

## 34.1 Spherical mechanisms

If all joint axes intersect at one point, every point moves on a sphere about
it: a **spherical mechanism**, the spherical analogue of a planar one, to which
most planar theory transfers with "lengths" becoming angles.

The correspondence is close enough to be worth using deliberately. Link lengths
become arc angles, the Grashof condition has a spherical counterpart, and the
four-bar's classification into crank-rocker and double-rocker survives intact.
A designer fluent in planar four-bars can work spherically by translating
vocabulary rather than learning new theory.

Mobility for a spherical chain uses `3` in place of `6`:

```
M = 3(n − 1) − 2j₁
```

which is the same arithmetic as the planar formula — for a different reason.
Planar motion has three freedoms (two translations, one rotation); spherical
motion also has three (three rotations about the common centre). The formulas
coincide and the mechanisms do not.

## 34.2 The universal joint

The **universal (Hooke) joint** is a spherical four-bar whose speed ratio is not
constant:

```
ω₂/ω₁ = cos β / (1 − sin²β·cos²θ₁)
```

Fluctuation grows quickly with the shaft angle `β`:

| `β` | Speed fluctuation |
|---|---|
| 5° | ±0.4% |
| 15° | ±3.5% |
| 30° | ±15% |
| 45° | ±41% |

Constant-velocity joints remove it by pairing two Hooke joints in phase — the
second joint's fluctuation cancels the first's if the shaft angles are equal and
the yokes are correctly clocked — or by using a Rzeppa-type ball arrangement,
where the balls are geometrically held in the plane bisecting the shaft angle.

The two-joint cancellation is exact only under those conditions, and a
driveshaft assembled with the yokes 90° out of phase **doubles** the fluctuation
instead of removing it. It is a classic assembly error and produces a vibration
that varies with steering angle.

## 34.3 Spatial four-bars

**RSSR** is the most common spatial four-bar: two revolutes and two spherical
joints. The formula gives `M = 2`, one of which is the connecting rod's passive
spin about its own axis — a freedom that does nothing and hurts nothing.

Its practical virtue is that it **tolerates misalignment**. A planar four-bar
requires its two ground axes to be parallel to a tolerance that gets tighter as
the mechanism gets wider; an RSSR does not require them to be parallel at all.
For anything assembled from separate brackets, that is often the deciding
factor.

## 34.4 Describing spatial geometry

**Denavit–Hartenberg** parameters (`a`, `α`, `d`, `θ`) standardise spatial link
geometry, with `T_i = Rot_z(θ)·Trans_z(d)·Trans_x(a)·Rot_x(α)`. For serial
chains this makes forward kinematics a product of matrices. For closed chains
the loop closure becomes `T₁T₂…T_n = I`, which is hard to solve — twelve scalar
equations of which six are independent, generally requiring numerical methods
and offering no branch guarantees.

This difficulty is precisely why planar mechanism theory is worth its own
treatment. In the plane, closure is two scalar equations per loop with a
closed-form solution and exactly two branches; in space, neither of those
statements survives.

**Screw theory** describes instantaneous motion as a twist (rotation plus
translation on an axis) and load as a wrench, with reciprocity giving constraint
analysis. It determines mobility and singularity far more reliably than
Grübler's formula, especially for overconstrained mechanisms — such as the
**Bennett linkage**, a four-R spatial chain that moves with one freedom despite
`M = −2`, provided `a₁ = a₃`, `a₂ = a₄`, `a₁/sin α₁ = a₂/sin α₂` and all offsets
are zero.

The Bennett linkage is the standing counterexample to trusting the mobility
formula. It moves; the formula says it cannot; the formula is counting
constraints that special geometry has made redundant. Whenever a mobility count
disagrees with a mechanism that demonstrably works, redundant constraint is the
first thing to suspect.

## 34.5 Design advice

Use S joints where possible for their passive freedom; avoid overconstraint
unless it is deliberate and understood; solve spherically when the problem
allows, because the planar theory transfers; and include assembly tolerance in
simulation, because a spatial mechanism that works at nominal geometry can jam
in reality. That last point is not a small correction — a planar mechanism with
a length error traces a slightly wrong path, while an overconstrained spatial
mechanism with the same error does not move at all.

---

# 35. Parallel mechanisms

## 35.1 Serial versus parallel

A **serial** chain connects the end effector to the base through one path: large
workspace, easy forward kinematics, low stiffness. A **parallel** mechanism uses
several independent chains: high stiffness and load capacity, low moving mass,
small workspace, and — the reverse of serial robots — **easy inverse kinematics,
hard forward kinematics**.

The inversion of difficulty is worth understanding, because it is structural
rather than accidental. In a serial arm, "where is the tip given the joints" is
a chain of matrix products, while "what joints put the tip there" requires
inverting that chain. In a parallel machine, each leg independently answers "how
long must I be for the platform to sit there" — trivial — while "where is the
platform given the leg lengths" couples every leg at once.

## 35.2 The common architectures

- **Stewart–Gough platform:** six variable-length legs, six DOF. Inverse
  kinematics is trivial; forward kinematics is a 40th-degree polynomial with up
  to 40 real assembly configurations. Flight simulators, machine tools, precision
  positioners.
- **Delta robot:** three arms with parallelogram linkages; the end effector keeps
  a fixed orientation and only translates. Very fast, because the motors stay on
  the fixed base and the moving mass is a few carbon rods. Pick-and-place at
  several hundred cycles per minute.
- **Planar 5-bar:** two cranks driving a common point. `M = 2`, two motors, any
  planar path.

## 35.3 Why two motors was the wrong answer here

That last one is the "easy" alternative to KREAMET's problem, and it shows why
it was rejected: with two motors any curve can be drawn, the synthesis problem
disappears — and a synchronisation problem appears in its place. Path accuracy
becomes a control problem, dependent on encoder resolution, servo bandwidth,
tuning and the load; two motors that drift apart trace a curve that nothing in
the geometry corrects.

A single-motor solution is qualitatively different because it **embeds the
motion in geometry**. The path is a property of the lengths, so it is as
repeatable as the parts are, it needs no calibration, it cannot lose
synchronisation, and it survives a power cycle. The synthesis is much harder;
everything after the synthesis is much easier. That trade — hard once at design
time, easy forever afterwards — is the argument for mechanism design as a
discipline.

## 35.4 Singularities

**Singularities** in parallel mechanisms come in three types
(Gosselin–Angeles):

- **Type 1** at the workspace boundary — the platform loses a freedom. The
  serial analogue; it limits the workspace but is not dangerous.
- **Type 2** **inside** the workspace, where the end effector can move with the
  actuators locked. Control is lost, forces blow up, and the platform can drop
  or lurch. This has no serial analogue and it is the reason parallel machines
  need their workspace mapped rather than merely bounded.
- **Type 3**, architecture-specific, arising when both conditions coincide.

Type 2 is the main risk distinguishing parallel from serial mechanisms. A
parallel machine's usable workspace is not the reachable set; it is the largest
singularity-free region inside the reachable set, and the difference between the
two can be most of the volume.

---

# 36. Interference, assembly layers and manufacture

## 36.1 Bar-to-bar distance

Kinematic analysis treats links as lines; real links have width. Model each bar
as a capsule (segment plus radius) and test the shortest distance between two
segments, which has a closed-form solution:

```
collision  ⟺  segmentDistance(A₁B₁, A₂B₂) < w
```

Links that share a joint necessarily "collide" near it; that is legitimate and
must be exempted, as must different members of the same body. Getting these
exemptions right is most of the work — an interference test that flags every
joint reports that every mechanism is impossible, which is true and useless.

## 36.2 A measured result: no coplanar solution exists

During KREAMET's development, in-plane interference was measured over 454
**valid** mechanisms (full rotation, every member within the length band).

**None was free of coplanar interference.** The rate was zero.

The cause is structural rather than incidental: three closed loops and fifteen
12 mm bars in one plane must cross one another. There is not enough plane. A
criterion treating interference as fatal — as the original specification did —
would have rejected **every** mechanism, including the sound ones, and would
have reported that the brief was impossible.

This is worth stating as a general lesson: when a constraint rejects 100% of
candidates, the first hypothesis should be that the constraint is wrong, not
that the problem is unsolvable. A measurement over a population is what
distinguishes the two, and it is cheap compared with abandoning a design.

## 36.3 The layered assembly model

Real multi-loop mechanisms, especially 3D-printed and laser-cut ones, are built
in **stacked parallel planes**. The fix is to model that:

1. Determine which bar pairs interfere over the revolution.
2. Build an **interference graph**: nodes are bodies, edges are interferences.
3. Colour the graph. Same colour = same layer.
4. The number of colours is the number of parallel planes required.

Optimal colouring is NP-hard; the **Welsh–Powell** greedy heuristic (sort nodes
by descending degree, then assign each the smallest colour unused by its
neighbours) is usually optimal at mechanism scale (8–14 nodes). At that size the
heuristic's worst case is not worth defending against — and a layer count that
is occasionally one too many is a manufacturing inconvenience, not a wrong
answer.

The reframing is the valuable part. "Do these bars collide?" is a yes/no
question with the answer always yes; "how many planes does this mechanism need?"
is a number that discriminates between designs, can be minimised, and
corresponds to something a workshop cares about.

## 36.4 The cost of layers

More layers means:

- **Longer pins.** A joint bridging `k` layers needs a pin `k` layers long, and
  long pins bend under load, producing joint angle error that no amount of
  dimensional accuracy corrects.
- **A thicker stack.** The mechanism departs from planarity, and out-of-plane
  moments appear at every joint.
- **Harder assembly.** Parts must go together in a specific order, and a
  mechanism that can only be assembled one way is a mechanism that will be
  assembled wrongly at least once.

Three things must therefore be measured: **layer count**, **maximum pin span**
and **total stack thickness**. KREAMET reports all three and includes them in
the objective. Every mechanism shipped with the app needs only **2 layers**.

## 36.5 Manufacturing methods and design rules

| Method | Tolerance | Layering | Note |
|---|---|---|---|
| FDM 3D printing | ±0.2 mm | Easy (separate parts) | Bushings or bearings required |
| SLA / resin | ±0.05 mm | Easy | Brittle; avoid thin sections |
| Laser cutting (acrylic) | ±0.1 mm | Natural (sheets) | Ideal for multi-layer |
| Waterjet (metal) | ±0.15 mm | Natural | Heavy; for high loads |
| CNC milling | ±0.02 mm | Hard | Expensive; precision prototypes |

Rules of thumb: joint hole to edge ≥ `1.5 ×` hole diameter; bar width ≥ `2 ×`
hole diameter; in FDM keep the layer direction perpendicular to the load; pin
length ≥ `2 ×` material thickness; clearance between moving parts ≥ `0.3 mm`.

Note how the tolerance column interacts with §37: a `±0.2 mm` FDM part in a
mechanism whose sensitivity is `∂P/∂b ≈ 8.6` gives a path error of `±1.7 mm`
from that one length alone. The choice of process and the choice of
transmission-angle limit are not independent decisions, and the cheap process is
affordable only in a well-conditioned mechanism.

---

# 37. Tolerances, backlash and error analysis

## 37.1 Where error comes from

| Source | Magnitude | Effect |
|---|---|---|
| Link length tolerance | ±0.05–0.2 mm | Systematic path deviation |
| Joint clearance | 0.05–0.3 mm | Random position uncertainty |
| Bearing clearance | 0.01–0.05 mm | Random |
| Elastic deformation | Load-dependent | Load-varying deviation |
| Thermal expansion | `α·ΔT·L` | Slow drift |
| Assembly error | ±0.1–0.5 mm | Systematic |

The distinction between **systematic** and **random** matters more than the
magnitudes. A systematic error is repeatable, so it can be measured once and
calibrated out. A random error cannot, and it sets the floor on what the
mechanism can do no matter how carefully it is set up. A design dominated by
joint clearance has a precision limit; one dominated by length tolerance has a
calibration opportunity.

## 37.2 Combining errors

**Sensitivity** `S_i = ∂P/∂x_i` is taken by finite differences, and total error
follows either as a worst-case sum:

```
ΔP_worst = Σ |S_i · Δx_i|
```

or, more realistically, as a root-sum-square:

```
ΔP_rss = sqrt( Σ (S_i · Δx_i)² )
```

The worst case assumes every tolerance is at its limit and every error pushes
the same way, which for a dozen independent parts is vanishingly unlikely — it
typically overestimates by a factor of two to three. RSS assumes independence
and roughly-normal distributions, which is usually closer to reality. Quote
both: the worst case for the "will it definitely fit" question, RSS for the
"what will it typically do" question.

## 37.3 Sensitivity is a design variable

Sensitivity is where design decisions really bite. Two mechanisms can trace the
same nominal path with very different sensitivities: one working near a
singularity amplifies a small length error, because the sensitivity terms scale
as `1/σ_min`. In a measured example, a four-bar with `∂P/∂b ≈ 1.8` turned into
`∂P/∂b ≈ 8.6` when driven near `μ_min = 12°` — five times worse from the same
tolerance. §40.8 works this example through.

That is the **third** justification for the transmission-angle limit, alongside
efficiency and functionality: **precision**. A design with slightly worse curve
error but a much better transmission angle usually performs better in real
manufacture. Chasing the last fraction of nominal RMS is misleading, because the
nominal is not what gets built.

Put sharply: **a nominal RMS is a property of the drawing, and the sensitivity
is what turns the drawing into a machine.** Two designs quoting the same RMS are
not comparable until their sensitivities are known.

## 37.4 When linearity fails

For large tolerances the linear estimate is inadequate and **Monte Carlo**
(typically `10⁴` samples) gives the real distribution — affordable with a
closed-form solver, which is one more return on that architectural choice.

Monte Carlo also answers questions the linear estimate cannot express at all:
what fraction of built units fail to complete a full rotation, what the *shape*
of the error distribution is (it is rarely normal near a singularity, where the
mapping is strongly non-linear), and whether the worst case is a fluke or a
substantial tail.

## 37.5 Spending the tolerance budget

Tolerance costs rise steeply as they tighten — roughly hyperbolically, so the
last factor of two is the expensive one. Run the sensitivity analysis first and
tighten only the **high-sensitivity** parameters; in a typical mechanism two or
three parameters produce 80% of the error, and holding the rest loose costs
nothing measurable.

Systematic error can also be removed by **calibration**: measure a few poses of
the real mechanism, fit the parameters to the measurements, and use the fitted
values thereafter. This is often dramatically cheaper than tightening
manufacture, because it buys accuracy with arithmetic instead of with machining
— and it works precisely because length errors are systematic.

Backlash is the exception: it is not calibratable, because its sign depends on
the direction of travel. A mechanism with `0.2 mm` of accumulated joint
clearance has a `0.2 mm` dead band no fitting procedure removes. Where backlash
dominates, the answers are preloaded joints, sprung takeup, or a compliant
mechanism (§38) that has no joints to have clearance.

---

# 38. Compliant mechanisms

## 38.1 What they trade

Compliant mechanisms produce motion by **elastic deformation** rather than
joints.

In their favour: no backlash, no friction, no lubrication and no wear at the
motion source; monolithic manufacture, so no assembly and no accumulated
clearance; and a scaling advantage — they get relatively better as size shrinks,
which is why essentially all MEMS mechanisms are compliant.

Against: limited range of motion, stored energy (the mechanism pushes back, and
that restoring force must be part of the torque budget), finite fatigue life,
and analysis that is non-linear as soon as deflections are large.

The scaling argument is worth spelling out. Friction and wear scale with area,
elastic restoring force with the cube of a linear dimension over the length —
so as everything shrinks, joint friction comes to dominate a pin-jointed design
while a flexure merely gets more compliant. Below a millimetre or so, a pin
joint is mostly stiction.

## 38.2 Lumped and distributed compliance

Two kinds:

**Lumped** compliance concentrates the flexing into thin "living hinges" between
otherwise rigid bodies. It behaves close to rigid-body theory, so the whole of
this reference applies with small corrections, and it is easy to design. Its
weakness is that all the strain is in a small volume, which limits fatigue life.

**Distributed** compliance lets the whole body flex. Strain spreads over more
material, so life is longer and range is greater, but there is no
rigid-body model to fall back on and analysis means finite elements.

The practical middle course is to design lumped, then redistribute compliance
locally at whichever hinge the stress calculation says is the limiting one.

## 38.3 The pseudo-rigid-body model

The **pseudo-rigid-body model (PRBM)** represents a flexible beam as a revolute
joint plus a torsional spring, with a characteristic radius factor `γ ≈ 0.85`
and stiffness coefficient `K_Θ ≈ 2.65` for an end-loaded cantilever:

```
pivot location = (1 − γ)·L from the fixed end
K_spring = γ · K_Θ · E·I / L
```

This is the bridge that makes the entire rigid-body synthesis toolkit apply to
compliant design: **design rigid first, then size the compliant equivalent.**
Everything in §19–§23 — Freudenstein, Burmester, optimisation-based synthesis —
can be run on the pseudo-rigid model, and the result converted afterwards.

The model is an approximation with a known validity range (deflections up to
roughly 65° of the pseudo-joint for the standard coefficients). Outside it, the
characteristic radius drifts and the answer must be checked numerically.

## 38.4 Stress and range

Maximum stress is:

```
σ_max = E·c/ρ_min
```

which must stay below the fatigue limit divided by a safety factor of 2–3. This
bounds the range of motion directly: larger motion means smaller radius of
curvature means higher stress. The chain is rigid — you cannot have a compliant
mechanism with a large range, a long life and a stiff material at the same time.

Materials with a high `σ_yield/E` ratio are wanted, because that ratio is
precisely the maximum elastic strain the material tolerates: titanium, spring
steel, polypropylene, nylon. Polypropylene living hinges survive millions of
cycles and are the reason flip-top bottle caps work; steel in the same geometry
would crack in hundreds.

## 38.5 Bistability

**Bistable** compliant mechanisms have two energy minima separated by a barrier,
so they hold either state with no power and snap between them. Switches,
latches, deployable structures and micro-relays. The design problem is shaping
`U(x)` to have the right two minima and the right barrier height — the same
potential-energy thinking as §29, used to create a feature rather than to
remove one.

## 38.6 Why not here

KREAMET produces rigid mechanisms because the target is a **fully rotating**
motion at 250 mm scale. A revolution is unbounded angular travel, and §38.4
bounds a flexure's travel at a few tens of degrees; the two requirements are
straightforwardly incompatible. No choice of material or geometry closes that
gap, which makes this one of the rare design decisions that needs no trade study.

---

# 39. Methods used in KREAMET

This chapter collects what the preceding theory turns into concretely.

## 39.1 Topology family

**One crank plus N RRR Assur dyads, solved in series**, with `M = 1` for every
`N`; `N = 1..6` offered, `N = 3` the original eight-bar. The app recomputes
mobility **from the constructed graph** and throws if it disagrees with the
formula.

## 39.2 Parameterisation

Bar lengths are direct variables; third points on ternary bodies use polar
`(r, α)`; ground pivots march outward with fixed spacing and variable heading.
The `(r, α)` choice makes rigidity structural — with three independent side
lengths the triangle inequality would have to be enforced separately and most
of the search space would be invalid. The dependent side follows from the law of
cosines and is bound-checked too: **every member that gets printed** is inside
`[Lmin, Lmax]`.

## 39.3 Position solution and branch continuity

Dyad by dyad, circle–circle intersection, no Newton iteration. The loop-closure
residual is therefore an **independent verification**, measured at
`1.3 × 10⁻¹³ mm` against a `0.05 mm` tolerance.

At every frame the root **nearest the previous frame** is chosen, and a
**warm-up lap** is solved before the reported one. Path closure measures
`1.4 × 10⁻¹⁴ mm`; assembly-mode jumps are `0`.

## 39.4 Singularity measurement

Two independent measures: `σ_min(∂F/∂q)` from the eigenvalues of `JᵀJ` by Jacobi
rotations, and the transmission angle `μ` — which is an **exact and free** proxy
because `det(J_dyad) ∝ sin μ`. The objective uses `μ`; both are displayed.

## 39.5 Transmission angle reference

The penalty is referenced to `45°`, not `60°`, because with `d = 120 mm` and
`a = 50 mm` the input dyad's analytic ceiling is `44.75°` (§15.5). An
unreachable target would generate a permanent penalty and pull the optimiser
away from curve fit. The hard rejection threshold is exposed as an editable
constraint.

## 39.6 Objective function

```
J = w₁·(E_curve/S_curve) + w₂·E_size + w₃·E_closure
  + w₄·E_singularity + w₅·E_buildability + w₆·E_ratio + w₇·E_gravity
```

Scaling is mandatory: the raw millimetre curve term outweighs the physical
constraints by two orders of magnitude and yields mechanisms with `1°`
transmission angles. Hard constraints are separated into bands (length
violation, failed rotation, assembly jump, severe singularity), each with a
gradient inside the band. The term breakdown is displayed, so the score is never
a black box.

## 39.7 Curve comparison and target

**Rigid** Procrustes alignment — rotation and translation only, **never scale**.
The optimal shift, direction, rotation and translation are found **exactly** by
circular cross-correlation. Error is a **symmetric Chamfer** distance measured
point-to-**segment** against a uniform-grid spatial index.

The built-in heart resolves **analytically**, not through a spline over its 64
control points: the spline sits about `0.13 mm` RMS off the true curve and
rounds the bottom cusp, which would measurably flatter the reported error. The
control points exist so the heart can be edited; moving one makes the curve
`custom` and hands it to the spline — an explicit user action, not a hidden
approximation.

## 39.8 Interference and layering

In-plane interference is kept as a **reported metric**; the **assembly layer**
model drives the objective, because none of 454 valid mechanisms was coplanar
interference-free at 12 mm bar width. All shipped designs need **2 layers**.

## 39.9 Sampling and optimisation

Sampling refines `180 → 360 → 720` frames, with final ranking **always** at 720.
Differential Evolution mixes `rand/1` with `current-to-best/1` over a
**constructively feasible seed population**, followed by bounded Nelder–Mead.
Lamarckian repair is used **only as a rescue** — repairing every offspring
stalled the search at a `J` plateau of `4.85`, while repairing only
non-assembling offspring reached `2.64`. The best 20 distinct solutions are
kept.

Optimisation runs in a Web Worker so the canvas keeps 60 FPS. The spec, the
target curve and a snapshot of the constraints travel with the request, because
the worker is a separate module instance and would otherwise optimise against
the defaults.

## 39.10 Dynamics

Line-density mass model (body geometry does not exist yet at synthesis time);
reduced inertia `M(θ)` by finite differences **with branch seeding**; Lagrange
torque `τ = M(θ)·θ̈ + ½·M'(θ)·θ̇² + U'(θ)` with the three terms displayed
separately. Gravity torque is verified two independent ways: the closed-loop
integral vanishes, and it agrees with a direct finite difference of `U` to
`1e−6`.

## 39.11 Measured results

The best shipped design, evaluated at 720 frames:

| Metric | Value | Target |
|---|---|---|
| Objective `J` | 1.1807 | — |
| Chamfer RMS | 11.41 mm | < 10 mm ("good") |
| Maximum error | 21.0 mm | — |
| Bounding box | 240.0 × 249.2 mm | 250 × 250 mm |
| Frames solved | 720 / 720 | 720/720 |
| Assembly jumps | 0 | 0 |
| Loop closure | 1.3 × 10⁻¹³ mm | < 0.05 mm |
| Path closure | 0.0 mm | < 0.1 mm |
| Effective transmission angle | 44.70° | > 40° (ceiling 44.75°) |
| Singularity margin `σ_min` | 0.228 | — |
| Assembly layers | 2 | — |
| Peak gravity torque | 0.236 N·m | — |

**An honest assessment:** every mandatory criterion is met. The `11.41 mm` RMS
is **just above** the `< 10 mm` "good" threshold and well short of the `2.5 mm`
"very good" one. The 20 distinct stored mechanisms cluster in `11.4–12.6 mm`,
which suggests the binding constraint is the **topology and the 50–200 mm length
band**, not the optimiser.

Obvious levers: free the crank length, admit a fourth ground pivot, widen the
length band, or run a much longer global search.

For comparison, the same method run on a **six-bar** (2 dyads) reached
`J = 5.63` with `55.0 mm` RMS — markedly worse. Eight bars really do appear
necessary for the heart.

---

# 40. Worked examples

Everything up to here is method. This chapter runs the method on numbers. Each
example is small enough to check by hand, and each one ends where a real design
decision would be taken — because the point of an analysis is never the number,
it is the decision the number forces.

## 40.1 Example: Grashof classification

**Given:** `a = 40`, `b = 120`, `c = 80`, `d = 100` mm, with `d` the frame and
`a` the input.

**Solution:**

```
s = 40 (a),  l = 120 (b),  p = 80,  q = 100
s + l = 160
p + q = 180
160 < 180  ⇒ the Grashof condition holds
```

The shortest link is `a`, and it is adjacent to the frame, so this is a
**crank-rocker**. The input turns through a full revolution, which is what a
motor drive needs.

**Check the inversions.** The Grashof inequality is a property of the *set* of
four lengths; which class you get depends on which link you bolt down:

| Frame | Class | Input behaviour |
|---|---|---|
| `d = 100` | crank-rocker | `a` revolves, `c` oscillates |
| `a = 40` (the shortest) | double crank (drag link) | both `b` and `d` revolve |
| `b = 120` | double rocker | neither revolves fully |
| `c = 80` | crank-rocker | `a` revolves |

This is worth internalising: **the same four bars give three different
machines.** If a synthesis run hands you lengths that will not turn, the fix may
be a different choice of frame rather than a different set of lengths.

## 40.2 Example: extreme values of the transmission angle

Same linkage. The extremes of `μ` occur when the input link lies along the
frame line, because that is where the effective frame distance seen by the
output dyad reaches its limits.

**Farthest position (`θ₂ = 0°`, crank pointing away from the frame):**

```
d' = d + a = 140
cos μ = (b² + c² − d'²) / (2bc)
      = (14400 + 6400 − 19600) / (2·120·80)
      = 1200 / 19200 = 0.0625
μ = 86.4°
```

**Nearest position (`θ₂ = 180°`):**

```
d' = d − a = 60
cos μ = (14400 + 6400 − 3600) / 19200 = 17200 / 19200 = 0.8958
μ = 26.4°
```

**Verdict:** the worst effective transmission angle over the revolution is
`26.4°`, well under the `40°` that §15 recommends. The linkage turns, but at the
near position it transmits force badly and loads its bearings hard. A mechanism
can satisfy Grashof and still be a poor machine; Grashof is about *whether* it
turns, `μ` is about *how well*.

**Attempted fix 1 — lengthen the output.** Take `c` from `80` to `95`:

```
near: cos μ = (14400 + 9025 − 3600) / (2·120·95) = 19825 / 22800 = 0.8695 → 29.6°
```

Better, still not enough.

**Attempted fix 2 — lengthen the crank.** Try `a = 55`, `d = 100`, so `d' = 45`:

```
cos μ = (14400 + 6400 − 2025) / 19200 = 0.9779 → 12.0°
```

Much worse. This is the instructive failure: a longer crank widens the band of
`d'` the dyad must span, and the worst angle is set by the *narrow* end of that
band. Growing the crank pushes the narrow end further down.

**The right move.** §15.5 says the two dyad links should be equal and both sized
to the middle of the `d'` band. Try `b = c = 100`:

```
near (d' = 60):  cos μ = (10000 + 10000 − 3600) / 20000 = 0.8200 → 34.9°
far  (d' = 140): cos μ = (20000 − 19600) / 20000 = 0.0200 → 88.9°
```

The worst effective angle is now `34.9°` — a real improvement obtained without
adding a single part, only by moving length from one bar to another. Shrinking
`a` narrows the band further and lifts `μ_min` again; that trade (crank length
against transmission angle) is the whole of §15.5 in one line.

## 40.3 Example: counting mobility

**Given:** a chain of 8 links — frame, crank, two ternary links, four binary
links — in which **three links meet at one pin**.

**The wrong count:** "I can see 10 pins, so `j = 10`."

**The right count:** a pin joining three links is **two** revolute pairs, not
one. Each additional link at the same pin adds another pair.

```
pins visible        = 10
pins joining 3 links = 1   ⇒ +1 extra pair
j = 11
M = 3(8 − 1) − 2·11 = 21 − 22 = −1
```

The chain is **overconstrained**: it does not move at all, barring a special
geometry that happens to make one constraint redundant. To make it a mechanism
you must add a link or remove a joint.

This is the numerical form of the mistake described in §5.2, and it is exactly
why KREAMET keeps `pointId` (where something is drawn) separate from `jointId`
(what is kinematically paired). A renderer that thinks in pins and a solver that
thinks in pairs will disagree about mobility, and the solver is right.

## 40.4 Example: checking that a dyad assembles

**Given:** an RRR dyad with `r₁ = 90`, `r₂ = 110` mm. Over one revolution of the
driver, the distance `d` between its two anchor points sweeps the band
`[70, 170] mm`.

**Assembly condition:**

```
|r₁ − r₂| ≤ d ≤ r₁ + r₂
|90 − 110| = 20 ≤ d ≤ 200
```

`[70, 170]` lies strictly inside `[20, 200]`, so the dyad **assembles at every
position** — the two circles intersect all the way round, and the mechanism
never jams. ✓

**Transmission angle at the band ends:**

```
d = 170: cos μ = (8100 + 12100 − 28900) / (2·90·110) = −8700 / 19800 = −0.4394
         μ = 116.1°  ⇒  μ_eff = 180 − 116.1 = 63.9°
d = 70:  cos μ = (8100 + 12100 − 4900) / 19800 = 15300 / 19800 = 0.7727
         μ = 39.4°   ⇒  μ_eff = 39.4°
```

Worst case `39.4°` — marginal. Try equal links, `r₁ = r₂ = 100`:

```
d = 170: cos μ = (10000 + 10000 − 28900) / 20000 = −0.4450 → 116.4° → μ_eff = 63.6°
d = 70:  cos μ = (20000 − 4900) / 20000 = 0.7550 → 41.0°  → μ_eff = 41.0°
```

Equal links are slightly better, and the worst case has moved up. But `41.0°`
against `63.6°` says the two ends are still unbalanced: the near end is doing
all the limiting while the far end has margin to spare. The optimum must be
where the two ends are **equally bad**.

**Solving for it.** With equal links `r`, `cos μ = 1 − d²/(2r²)`. Setting the
near-end angle equal to the far end's effective angle gives `cos μ_near =
−cos μ_far`, so

```
1 − d_min²/(2r²) = −(1 − d_max²/(2r²))
(d_min² + d_max²) / (2r²) = 2
r² = (d_min² + d_max²) / 4
```

For this band:

```
r² = (4900 + 28900) / 4 = 8450  ⇒  r = 91.92 mm
cos μ = 1 − 4900 / 16900 = 0.7101 → μ = 44.75°
d = 170: cos μ = 1 − 28900 / 16900 = −0.7101 → 135.25° → μ_eff = 44.75° ✓
```

Both ends land on `44.75°` at once. That is the **analytic ceiling** of §15.5 —
no choice of `r₁, r₂` does better for a band of `[70, 170]`, and the ceiling is
a property of the band, not of the search that found it. Knowing this number
before optimising is what tells you whether a solver that reports `44°` has
nearly finished or barely started.

## 40.5 Example: gravity torque on a crank

**Given:** a crank lying horizontal, `L = 150 mm`, linear density
`ρ = 0.00035 kg/mm`.

```
m = ρ·L = 0.00035 × 150 = 0.0525 kg
c = L/2 = 75 mm = 0.075 m
U(θ) = m·g·(L/2)·sin θ = 0.0525 × 9.80665 × 0.075 × sin θ
     = 0.03861·sin θ   [J]
τ = dU/dθ = 0.03861·cos θ   [N·m]
```

Peak torque `0.0386 N·m` at `θ = 0` (horizontal, the longest lever arm), zero
when the crank stands vertical. Both agree with intuition, which is the first
thing to check on any derived quantity.

**Integral over one revolution:**

```
∫₀^{2π} 0.03861·cos θ dθ = 0.03861·[sin θ]₀^{2π} = 0  ✓
```

Gravity does no net work over a closed cycle. This identity is worth testing in
software: it is cheap, it is exactly zero in theory, and it fails loudly if a
sign or an index is wrong anywhere in the potential-energy chain.

## 40.6 Example: reduced inertia, and why tip mass hurts

The same crank, rotating about `O₂`:

```
I_O2 = m·L²/3 = 0.0525 × (0.150)² / 3 = 3.94e−4 kg·m²
```

(`mL²/3` is the thin rod about an end.) Now bolt a `0.02 kg` point mass — a
bearing, a pin, an LED and its wiring — to the crank tip:

```
I_add   = 0.02 × 0.150² = 4.50e−4 kg·m²
I_total = 8.44e−4 kg·m²
```

The added mass is **38% of the rod's mass** but contributes **more inertia than
the entire rod**. The rod's own material is spread from `0` to `L` and averages
`L²/3`; the point mass sits at `L²`. That factor of three is the whole argument
for keeping heavy parts near the centres of rotation, and it is why an
optimiser that is allowed to grow links will quietly ruin the dynamics unless
inertia is in the objective.

## 40.7 Example: the three terms of motor torque

Let `M(θ) = 8e−4 + 3e−4·cos(2θ)` kg·m² be the reduced inertia, `ω = 6.28 rad/s`
(60 rpm) held constant, and `U'(θ) = 0.15·cos θ` N·m the gravity term.

```
M'(θ) = −6e−4·sin(2θ)
τ = M·θ̈ + ½·M'·θ̇² + U'
  = 0                          (constant speed ⇒ θ̈ = 0)
  + ½·(−6e−4·sin 2θ)·39.4
  + 0.15·cos θ
  = −0.0118·sin(2θ) + 0.15·cos θ
```

Peak near `θ = 0` is about `0.15 N·m`: **gravity dominates**, and the
inertia-variation term is an 8% ripple on top of it.

Now raise the speed to 600 rpm, so `θ̇² = 3948`:

```
peak of ½·M'·θ̇² = 0.5 × 6e−4 × 3948 = 1.18 N·m
```

The inertia term now exceeds gravity **eightfold**. Nothing about the mechanism
changed — only the speed. The lesson is that "gravity is negligible here" and
"inertia is negligible here" are not properties of a linkage; they are
properties of a linkage *at an operating speed*, and a design reviewed at one
speed has not been reviewed at another.

Note also that the inertia term goes as `θ̇²` while the gravity term does not
depend on speed at all. Doubling the speed quadruples one and leaves the other
alone, so the crossover is sharp: there is a speed below which a mechanism is a
statics problem and above which it is a dynamics problem, and it is usually
worth knowing which side of it you are on.

## 40.8 Example: tolerance sensitivity near a singularity

The sensitivity of a four-bar's coupler point to the length `b` was measured by
finite difference at two operating points of the same linkage.

**Well away from a singularity:**

```
∂P/∂b ≈ 1.8   (dimensionless, mm per mm)
```

With a `±0.1 mm` tolerance on `b`, the path wanders by `±0.18 mm`.

**Near a singularity (`μ_min = 12°`), same measurement:**

```
∂P/∂b ≈ 8.6
```

Now the same `±0.1 mm` gives `±0.86 mm` — nearly **five times worse** for an
identical part, an identical drawing and an identical nominal path.

This is the concrete form of §37.3. The transmission angle is usually taught as
a statement about force, but it is equally a statement about *manufacturing*:
the Jacobian that maps joint motion to output motion is the same Jacobian that
maps length errors to output errors. A mechanism running near a singularity
amplifies both, so buying tighter tolerances to rescue a badly conditioned
linkage is paying money to work around a geometry problem.

## 40.9 Example: reading a synthesis result critically

Suppose a search returns a candidate with the following report:

```
RMS path error   4.9 mm
μ_min            21°
full rotation    720 / 720 frames
closure residual 3e−13 mm
```

The RMS is attractive and the rotation is complete, so the temptation is to
accept it. Work through it instead:

- `μ_min = 21°` is below every recommendation in §15. At that angle the bearing
  loads are roughly `1/sin 21° ≈ 2.8×` the useful force, and by §40.8 the
  tolerance sensitivity is several times its nominal value.
- The closure residual only says the *solver* is consistent. It is the same
  `1e−13` whether the mechanism is excellent or dreadful, so it verifies the
  arithmetic and nothing else.
- `720 / 720` says it turns at the nominal lengths. It says nothing about
  whether it still turns when every length has moved by its tolerance.

A second candidate with `RMS 6.4 mm` and `μ_min = 38°` is the better machine
even though it loses on the headline number. **Kinematic validity outranks a
low error**, always, and holding that ordering under the pull of a tempting RMS
is the single judgement that most distinguishes a synthesis tool from a curve
fitter.

---

# 41. Common mistakes

Every item below has been made, by competent people, in real projects. They are
grouped by the stage at which they are made, because that is the stage at which
they are cheapest to catch.

## 41.1 Counting and topology

- Leaving the frame out of `n`. The frame is a link; a four-bar has four.
- Counting a multi-link pin as a single joint. Three links at one pin is **two**
  revolute pairs (§40.3).
- Counting a welded or bolted connection as a joint. If it does not permit
  relative motion, it is not a pair — it is one body drawn in two pieces.
- Treating Grübler's formula as infallible where overconstraint or passive
  freedoms exist. The Bennett linkage (§34.4) moves with `M = −2`.
- Forgetting that a mobility of 1 is a *necessary* condition and not a
  sufficient one: a chain can have `M = 1` and still be unable to assemble.

## 41.2 Analysis

- Ignoring branch continuity. The most damaging error in the whole list,
  because the mechanism still "solves" — it just teleports between assembly
  modes and reports a path no machine can trace.
- Fixing the root by sign instead of by proximity to the previous solution. Sign
  conventions are not preserved through a revolution.
- Taking finite differences without branch seeding, giving silently wrong
  velocities and accelerations, and a reduced inertia with spurious spikes.
- Skipping the warm-up lap and then mistaking the start-up artefact for a real
  defect in the mechanism.
- Treating a Newton residual as verification. A residual says the solver
  converged, not that it converged to the branch you wanted.
- Measuring singularity proximity by `det(J)` alone instead of `σ_min`. The
  determinant scales with the units and the size of the mechanism; the smallest
  singular value does not.

## 41.3 Synthesis

- Not scaling the objective terms, so a millimetre-scaled curve error swamps
  every physical constraint by orders of magnitude.
- Using similarity (scaled) Procrustes, which quietly reports that a mechanism
  half the required size traces the target perfectly.
- Using one-sided Chamfer, which rewards a mechanism that traces a small part
  of the target very accurately.
- Referencing an unreachable target — for instance a transmission-angle goal
  above the analytic ceiling — so the term never reaches zero and permanently
  distorts the ranking.
- Ranking candidates at coarse sampling, where the ranking is noise.
- Repairing every offspring, which collapses the population's diversity onto
  the repair operator's fixed points.
- Checking kinematic validity only after the search rather than inside the
  objective, which spends the entire budget exploring mechanisms that cannot
  turn.

## 41.4 Manufacture

- Treating links as lines and never checking interference at all.
- Treating interference as fatal when layered assembly is the real answer
  (§36.2 — the criterion rejected 100% of valid mechanisms).
- Verifying only nominal geometry and never asking what happens at the
  tolerance limits.
- Exempting dependent members from the length band. A ternary link's third
  side is a printed part like any other, and an optimiser will happily hide an
  800 mm member there if nothing measures it.
- Mixing units (§25.4).

## 41.5 Reporting

- Presenting an unoptimised number as a result.
- Giving averages where the worst case is what matters. A mean transmission
  angle of 60° is compatible with a mechanism that jams.
- Presenting partial success as partial quality. A mechanism that completes
  `335/720` frames is not 47% of a mechanism — it is a mechanism a motor
  cannot turn, and its RMS error over the frames it did complete is
  meaningless.
- Quoting a metric without saying which definition produced it, so that a
  number computed under an old scoring rule sits unlabelled beside a new one
  (§45.6).

---

# 42. Design checklist

A checklist is not a substitute for judgement; it is a defence against the
particular failure of judgement where an experienced designer skips a step
precisely because they know it usually passes.

## 42.1 Topology

- `n` and `j` counted correctly, multi-link pins included.
- `M = 3(n−1) − 2j₁ − j₂` computed and equal to 1.
- Mobility verified independently from the graph the software actually built,
  not from the formula it was supposed to satisfy.
- Incidence consistent (`Σ deg = 2j`).
- No disconnected body.
- `L = j − n + 1` computed, and each loop identified.

## 42.2 Kinematics

- Every frame of the revolution solves.
- Zero assembly-mode jumps.
- Loop-closure residual below tolerance at every frame.
- Path closure below tolerance.
- Warm-up lap performed and discarded.
- The input link genuinely rotates fully — checked, not assumed from Grashof.

## 42.3 Force transmission

- `μ` computed for every dyad over the whole cycle, not sampled at a few
  positions.
- The worst `μ_eff` reported, and above the project limit.
- The analytic ceiling computed for each dyad's band, and the target referenced
  to an attainable value.
- `σ_min` tracked over the cycle.
- Dead points outside the working range.

## 42.4 Geometry and manufacture

- Every printed member — including dependent sides of ternary links — within
  the length band.
- Link ratios sensible; no member an order of magnitude away from its
  neighbours.
- In-plane interference measured and reported, not assumed absent.
- Layer count, maximum pin span and stack thickness computed.
- Hole-to-edge and width rules satisfied for the chosen process.

## 42.5 Dynamics

- Mass model defined and documented, including its fidelity.
- Reduced inertia `M(θ)` computed, and its ripple assessed.
- Peak gravity torque measured.
- Closed-loop integral check passed (`∮ dU/dθ · dθ ≈ 0`).
- Finite-difference check passed against the virtual-work torque.
- Motor peak, RMS and peak power computed at the operating speed.
- Flywheel sized if the energy fluctuation warrants it.

## 42.6 Precision

- Sensitivities computed for the critical parameters.
- Tolerance budget allocated to the high-sensitivity parameters only.
- Backlash effect estimated separately, since it does not calibrate out.
- Monte Carlo run where the linear estimate is not trustworthy.

## 42.7 Reporting

- Initial guess and optimised result clearly separated and separately labelled.
- The code path that produced each number identified.
- Worst-case values given alongside averages.
- Unmet targets stated explicitly rather than omitted.
- The design file — topology, parameters, constraints and target — exported
  together, since a parameter vector is meaningless without them.

---

# 43. Six-bar linkages

## 43.1 Why six bars

The four-bar is the workhorse of planar mechanism design, and its coupler
curves are far richer than most people expect. But it runs into three walls
that no choice of lengths gets past:

- It cannot produce an **exact dwell** — only an approximate one, and only
  where the coupler curve happens to be nearly circular.
- Output swing and transmission angle are locked in a tight trade: a large
  swing is bought with a poor `μ`, and vice versa.
- Motion synthesis has no solution beyond **five prescribed positions**
  (§22). Ask for six and the Burmester equations are inconsistent.

A six-bar (`n = 6`, `j = 7`, `M = 1`) clears all three. Its link distribution is
forced by the mobility count (§4.2): **two ternary links and four binary
links**, always. There is no other way to spend six links and seven revolute
pairs at one degree of freedom, which is why the six-bar catalogue is short and
completely enumerable.

## 43.2 The Watt chain

The two ternary links are **adjacent** — they share a joint.

- **Watt I:** both ternary links move.
- **Watt II:** one ternary link is the frame.

**Watt II is two four-bars in series**: the output of the first is the input of
the second. That single structural fact makes analysis almost trivial — solve
four-bar one, take its output angle, feed it in as the input of four-bar two,
solve again. Two independent closed-form solutions, in order, with no coupling
to unpick.

Uses: widening the range of motion, applying two different velocity laws one
after the other, and reaching output-angle ranges a four-bar cannot cover
without a wretched transmission angle.

## 43.3 The Stephenson chain

The two ternary links are **separated** — they share no joint.

- **Stephenson I, II, III:** which of the links is the frame.

**Stephenson III** is the most used. The input drives a four-bar loop, and a
point on its coupler drives a second dyad. This is emphatically **not** two
four-bars in series: the loops are interlocked, and the order in which you
solve them has to be worked out rather than assumed.

The `N = 2` member of KREAMET's family (six bars) is a Stephenson-type
structure: the first dyad closes between the crank and the second ground pivot,
and the second dyad hangs off a rigid point on the first dyad's link and closes
against the third ground pivot.

## 43.4 Dwell mechanisms

The most valuable thing a six-bar does is produce a dwell that is **not exact
but very good**. The method (§17.4):

1. Choose a four-bar and find a region of its coupler curve that is very nearly
   a circular arc.
2. Anchor a second dyad at the centre of that arc, with a link length equal to
   the arc radius.
3. While the coupler point traverses that region, the second dyad's output
   barely rotates at all.

Dwell quality follows directly from how circular the arc really is. The measure
to use in synthesis is the maximum deviation between that stretch of curve and
the best-fit circle through it — a number you can compute, put in an objective,
and hold a tolerance on.

**Advantage over a cam:** no higher pair, so no sliding contact, no wear
surface, and no speed limit imposed by follower jump.
**Disadvantage:** the dwell is not exact. Typically `±1–2°` of residual motion
remains, which is fine for a feed mechanism and not fine for an indexing head.

## 43.5 Quick return

A six-bar reaches time ratios a four-bar cannot. The classic **Whitworth
mechanism** is a six-bar and gets past `Q = 2`.

Uses: shapers, power saws, press feeders — anything where the working stroke
should be slow and strong and the return stroke should get out of the way.

The reason the six-bar wins here is the same reason it wins at dwell: the
second loop can be arranged so that the output's *angular* progress is a
strongly non-linear function of the input's, and there are simply more
parameters with which to shape that function.

## 43.6 Walking mechanisms

For a legged machine, the foot path has to satisfy three conditions at once:

- **Straight** and at **constant speed** while in contact with the ground, so
  the body advances smoothly and the foot does not scuff.
- A rise clear enough to swing over obstacles while airborne.
- Closed, and traced in a single loop per revolution.

**Chebyshev** and **Klann** linkages are the classical answers. The **Theo
Jansen** linkage is an eight-bar chain whose length ratios — Jansen's "holy
numbers" — are the output of a search that optimises exactly those three
conditions.

That is worth dwelling on: the most famous linkage of the last fifty years is
not a closed-form construction at all. It is the result of dimensional search
over a many-bar chain for a coupler point that follows a prescribed path — the
same problem KREAMET solves, run by hand over years instead of by a solver over
seconds.

## 43.7 The order of analysis in a six-bar

For series structures like Watt II:

```
solve four-bar 1 → output angle → input of four-bar 2 → solve
```

For interlocked structures like Stephenson III, the Assur decomposition
(§6) gives the order:

```
crank → dyad 1 (RRR) → rigid point on dyad 1's link → dyad 2 (RRR)
```

Both are closed form. **A six-bar is not analytically harder than a four-bar —
it just has more steps.** This is the single most useful thing to know about
six-bars, and it generalises: as long as a chain decomposes into dyads, adding
links adds computation time linearly and adds no numerical difficulty at all.
It is the reason KREAMET's `4 … 14` bar family shares one solver rather than
one solver per size.

---

# 44. A catalogue of classical mechanisms

This chapter gathers the linkages a designer actually reaches for, in one
place. For each: what it does, how it is built, and where it stops working.

The catalogue matters even when you have a synthesis tool. A search over
lengths finds a mechanism that fits *your* path; a catalogue tells you when
someone has already solved the problem exactly, when the exact solution is
cheaper than the searched one, and — most usefully — what shapes are reachable
at all.

## 44.1 Approximate straight-line mechanisms

**Watt (1784).** Two equal links with a coupler between them. The midpoint of
the coupler traces a long thin figure-of-eight whose centre stretch is very
nearly straight.

```
a = c,  coupler point at the midpoint of b
straight stretch ≈ 0.4·b long
```

Watt devised it because no boring machine of the day could make a cylinder
accurate enough for a rigid crosshead. It is the historical starting point of
the whole subject.

**Chebyshev.** A symmetric four-bar:

```
d : a : b = 2 : 1 : 2.5,   c = b
coupler point at the midpoint of b
```

Deviation over the central region is of the order of `0.1%` of the stroke.

**Hoeken.** The inversion of Chebyshev. It gives an approximately **constant
speed** along the straight stretch, not merely a straight one:

```
a = 1,  b = c = 2.5,  d = 2
coupler point: on the extension of AB, 2.5 units from A
```

This combination — straight *and* uniform — is why Hoeken is the most used
approximate straight-line linkage in walking machines and conveyors. A foot
that moves straight but with varying speed still drags.

**Roberts.** Symmetric, with a triangular coupler:

```
a = c,  coupler an isosceles triangle
long straight stretch, but larger deviation than Chebyshev
```

The trade is explicit: Roberts buys length of stroke with accuracy.

**Peaucellier–Lipkin (1864).** Eight links producing an **exact** straight
line, not an approximate one. It works by geometric inversion:

```
|OP| · |OQ| = constant
```

A point constrained to a circle through `O` inverts to a point on a straight
line. Its historical weight is enormous — it settled the open question of
whether linkages could produce exact rectilinear motion — but with eight links
and six joints in the error chain, backlash accumulates and it is rarely the
practical choice.

## 44.2 Other rectilinear-motion mechanisms

**Scott–Russell.** Exact straight-line motion from two links and one slider:

```
|AB| = |BC| = |BP|
```

`P` travels on an exact straight line. Compact, exact, and it costs a
prismatic pair — which is precisely the trade the brief behind KREAMET refuses,
and a good illustration of why "cam-free and slider-free" is a real constraint
rather than a stylistic one.

**The Cardan (hypocycloid) arrangement.** Roll a gear inside an internal gear
of twice its diameter, and a point on the small gear's circumference traces an
**exact straight line** — a diameter of the large gear. The most elegant
gear-based rectilinear drive there is, and a good reminder that the linkage
catalogue and the gear catalogue overlap.

## 44.3 Dwell and indexing mechanisms

**The Geneva mechanism.** Continuous input, intermittent indexed output. An
`n`-slot Geneva wheel advances `1/n` of a turn per input revolution and stands
completely still in between.

```
motion fraction = (n − 2) / (2n)
```

For four slots that is `25%` motion and `75%` dwell. It is the classical answer
in film projectors and indexing tables, where the dwell must be *exact* because
something is being photographed or machined during it.

Limit: there is an acceleration step at the entry and exit of each slot, so it
is noisy and hard on bearings at speed. Modified profiles soften this but do
not remove it.

**Six-bar dwell.** §43.4. Smoother, quieter, and never exact.

**Cam.** Exact dwell with complete control of the motion law — paid for in
contact stress and wear (§32).

The choice among the three is nearly always decided by whether "exact" is a
requirement or a preference.

## 44.4 Quick-return mechanisms

**Crank-shaper.** A crank drives a long rocking arm through a slider:

```
Q = (180° + β) / (180° − β),   β = 2·arcsin(a/d)
```

For `a/d = 0.5`, `β = 60°` and `Q = 2.0`.

**Whitworth.** The same principle with the crank pivot closer to the fixed
pivot, so `Q > 2` becomes reachable. The distinction between the two is
literally which side of the fixed pivot the crank circle falls on.

## 44.5 Force amplification and clamping

**Toggle mechanism.** As two links approach collinearity, the mechanical
advantage runs away:

```
F_out / F_in = 1 / (2·tan θ)
```

As `θ → 0` the ratio diverges. Used in presses, mould-closing gear and
quick-release clamps.

The trade is unavoidable and follows from conservation of power: at the point
of maximum force the output **velocity is zero**. You cannot have force and
speed from the same geometry at the same instant. A toggle is a singularity
that has been deliberately parked at the useful end of the stroke — the same
configuration §14 tells you to avoid, exploited on purpose.

**Pantograph.** A parallelogram-based linkage that scales a point's motion by a
fixed ratio. Copy-milling machines, engraving, drawing instruments, and the
current collectors on electric trains.

## 44.6 Orientation-preserving mechanisms

**Parallelogram (parallel-motion) linkage.** The coupler translates without
rotating. Desk-lamp arms, weighing mechanisms, delta-robot legs, drafting
machines.

Watch out: at the aligned position a parallelogram can jump into the
**anti-parallelogram** branch, after which the coupler counter-rotates and the
mechanism is wrong without being broken. This is a branch-continuity failure
(§10) in its most visible form. The standard fixes are a redundant link or a
second parallelogram at a phase offset, so that one of them is always away from
the ambiguous configuration.

**Sarrus linkage.** Two three-link RRR chains in mutually perpendicular planes.
It produces pure rectilinear translation using **only revolute joints** — no
prismatic pair anywhere. Spatial, not planar, and the cleanest existence proof
that a slider is a convenience rather than a necessity.

## 44.7 Inversion and axis transfer

**Inversors.** Peaucellier and Hart's linkages transform a point's motion by
geometric inversion. Hart's inversor does it with six links rather than eight.

**Spherical four-bar.** Transfers rotation from one axis to another. All joint
axes must pass through a common point (§34), which means the axes it connects
have to intersect.

**Universal (Cardan) joint.** Transfers rotation between intersecting axes, at
the cost of a fluctuating velocity ratio (§34.2). Two of them in series, phased
correctly, cancel the fluctuation — which is why driveshafts come in pairs of
joints and not one.

## 44.8 Selection table

| Requirement | Reach for |
|---|---|
| Approximate straight line, constant speed | Hoeken |
| Approximate straight line, flattest | Chebyshev or Watt |
| Exact straight line | Peaucellier, Scott–Russell, or Sarrus (spatial) |
| Exact dwell, indexing | Geneva |
| Smooth dwell, no sliding contact | Six-bar (Watt II or Stephenson III) |
| Arbitrary motion law with exact dwell | Cam |
| Quick return | Whitworth or crank-shaper |
| High force, short stroke | Toggle |
| Orientation preserved | Parallelogram |
| Scaling a motion | Pantograph |
| Transfer between intersecting axes | Universal joint or spherical four-bar |
| An arbitrary prescribed path | Many-bar chain + dimensional synthesis |

The last row is the one this software is about. Every row above it is a solved
problem with a name; the last row is a search, and it is where you end up when
the path you need is not on anybody's list.

---

# 45. Simulation and verification in practice

## 45.1 What a simulation can and cannot tell you

A simulation verifies exactly as much as it models. Rigid-body kinematics
assumes all of the following, and every one of them can be violated in a real
machine:

- Links do not deform.
- Joints have no clearance.
- Friction is negligible, or simply modelled.
- Geometry is at its nominal value.
- Material properties are constant — no temperature or humidity effect.

A mechanism that works perfectly in simulation will fail in reality if any one
of these is violated far enough. That is not a defect in the simulation; it is
the definition of a model. It does mean that a simulation is a **design tool,
not a certificate of acceptance**, and that the useful question is never "did
it pass?" but "which of the assumptions is this design leaning on hardest?"

## 45.2 Layers of verification

Verification in reliable mechanism software is layered, cheapest and most
certain first:

**(1) Invariants.** Things that must hold because of what the objects are:

- The crank tip stays on a circle of the crank's radius.
- Distances between ground pivots never change.
- The loop-closure residual sits at machine precision.
- The distance between two points on the same rigid body is constant.

These are the best tests in the whole suite. They need no reference data, they
hold for every input, and they fail loudly on exactly the kind of indexing and
sign errors that are otherwise invisible.

**(2) Comparison with closed-form results.** Where an answer is known
analytically:

- The four-bar solution agrees with Freudenstein's equation.
- Gravity torque agrees with a finite difference of `U`.
- Around a closed loop, `∮ dU/dθ · dθ = 0`.

**(3) Symmetry and conservation.** Consequences of physical law:

- Mass scales linearly with linear density.
- Raising a body by `Δh` raises potential energy by `m·g·Δh`.
- Net work over a full cycle is zero.

**(4) Regression.** Results already verified must not change:

- Stored optimised designs, re-evaluated with the current solver, must
  reproduce their recorded metrics.

**(5) End-to-end (smoke).** In a real browser, through real interaction:

- Dragging the crank drives the motor angle to the expected value.
- The screen↔world transform round-trips to identity.
- Playback advances the angle.

The layering matters because the layers fail differently. An invariant failing
means the geometry is wrong; a regression failing means a definition moved; a
smoke failure usually means the wiring between two correct pieces is wrong.
Knowing which layer broke is most of the debugging.

## 45.3 What not to test

Over-testing turns the test suite itself into the maintenance burden, and a
suite people are afraid to change stops protecting anything. Do not test:

- The library's own behaviour (Three.js multiplying matrices correctly).
- Exact values of randomly generated data — test its *properties* instead.
- User-interface copy (checking that the i18n keys match is enough).
- Floating-point results for exact equality.

The general rule: test the thing you would be embarrassed to get wrong, not the
thing that is merely easy to assert.

## 45.4 Choosing tolerances

| Test | Tolerance | Why |
|---|---|---|
| Loop closure | `1e−9 mm` | Closed form gives `1e−13`; margin is ample |
| Path closure | `0.1 mm` | Specification value |
| Crank radius | `1e−9 mm` | Direct computation; there should be no error |
| Mass scaling | `1e−9` relative | Linear relation, should be exact |
| Gravity torque vs finite difference | `1e−6` | Finite-difference error is this size |
| `∮ dU/dθ` | `1e−3` | Numerical integration error |

A tolerance should be **a few times the expected error**, and it should be
chosen from an argument about where the error comes from, not by loosening it
until the test goes green. Too tight and the test is flaky; too loose and it
stops catching real regressions. A tolerance with a comment explaining its
magnitude is a tolerance somebody can safely change later.

## 45.5 Generating numbers, and honesty about them

The most important property of an engineering tool is that the provenance of
every number it reports is known. Two rules:

**(1) No hand-written numbers.** Every value presented as an optimisation
result must come from an actual solver run. Inventing a plausible-looking
number is the most damaging class of error there is, precisely because nothing
about it looks wrong — it survives review, it gets quoted, and it is discovered
only when a part does not fit.

**(2) Initial guess and result stay separate.** "Initial guess" and "optimised
result" must be labelled differently and never merged. A poor initial guess is
not an embarrassment to be tidied away; it is the measurement of how much the
optimisation actually achieved, and hiding it hides the only evidence that the
search did anything.

KREAMET builds both rules into its architecture rather than its documentation:
stored results are the output of a solver run, the tests re-derive them, and
the interface carries a badge saying which design came from where.

## 45.6 When a scoring definition changes

When an objective term is redefined, the recorded `J` values of stored results
go **stale**. An old `J` is not a new `J`, but it looks exactly like one — same
field, same units, same plausible magnitude — and nothing in the file says
which definition produced it.

The correct operation is to re-measure the metrics with the current solver
**without touching the design vectors**, preserving each run's provenance.
KREAMET has a separate script for exactly this; the last time it was applied,
the largest movement in a recorded objective value was `2.0 × 10⁻³`.

The wrong operation — and it is tempting because it is one line — is to
re-run the optimiser and store whatever comes out. That silently replaces the
design as well as the score, and the provenance chain is broken with no trace.

## 45.7 Measuring performance

Synthesis time is bounded almost entirely by solver speed. Measured in this
application, in a typical browser or Node environment:

| Operation | Time |
|---|---|
| Position solution for one frame (3 dyads) | ~5 µs |
| Full revolution, 720 frames | ~4 ms |
| One objective evaluation (coarse, 180 frames) | ~8 ms |
| One objective evaluation (fine, 720 frames) | ~30 ms |
| Constructive sampling (one feasible individual, N=3) | ~1.6 ms |

A differential-evolution run of `50 × 120 = 6000` evaluations takes roughly
`50 s` at coarse sampling. Local refinement runs at fine sampling, so its cost
is of the same order.

These numbers are the argument for closed-form kinematics being an
**architectural** decision and not a micro-optimisation. A Newton-iterating
solver is 5–20× slower per frame; the same search would take hours to days, and
a search you cannot run interactively is a search nobody will run twice. The
speed is not there to be impressive — it is there so that trying a different
mechanism size costs a minute rather than an afternoon.

---

# 46. Frequently asked questions

## 46.1 “It works in simulation but jams in reality.”

In order of likelihood:

The **transmission angle is too small**. Simulation is frictionless; reality
self-locks when `tan(μ_eff) < f`, so a mechanism at `μ_eff = 10°` with a dry
plastic bush (`f ≈ 0.2`) is at the edge of locking before it carries any load at
all. This is the first thing to check and the most common answer.

The **assembly is overconstrained**. Out-of-plane misalignment binds a
mechanism that is perfectly happy in a two-dimensional model. Substituting a
spherical joint, adding clearance, or accepting a slightly less rigid mounting
usually fixes it.

Two bodies **share a layer and cross**. Check the layer assignment against what
was actually built — a mechanism designed for two layers and assembled in one
will bind at exactly the positions the interference analysis predicted.

**Long pins are bending** under load, so the effective joint centre moves and
the geometry is no longer the geometry that was analysed.

## 46.2 “The optimiser finds a good curve but the mechanism looks strange.”

The objective is not measuring something you care about. "Looks strange" is
your eye applying a constraint that the objective does not contain.

Work through what your eye is seeing: extreme link ratios, one member far
longer than the rest, bars crossing awkwardly, pivots in impractical places, a
mechanism that is technically valid at every frame but spends most of the
revolution near a limit. Each of those corresponds to a term that is missing or
underweighted — size, ratio, interference, transmission angle.

The remedy is to name the thing you dislike and measure it. An optimiser
satisfies exactly what it is asked for, and "looks reasonable" is not a
specification until it is one.

## 46.3 “The optimisation stalls.”

Four common causes, in the order worth checking:

- The **seed population is invalid** — most individuals cannot complete a
  revolution, so the search has no gradient to follow. Use constructive
  sampling that produces feasible individuals by construction.
- The **penalty band is flat**. A constraint that returns a constant penalty
  for any violation tells the search nothing about which direction is better.
  Include the violation magnitude.
- **Repair is over-applied**. Repairing every offspring collapses diversity;
  repair should rescue occasional individuals, not normalise the population.
- A **reference value is unattainable**, so one term never approaches zero and
  dominates the ranking permanently.

## 46.4 “How many links should I use?”

More links mean richer curves but more backlash, more friction, more layers,
higher cost and a bigger search space. Use the fewest that reach acceptable
error.

Measured here: six bars gave `55 mm` RMS for the heart while eight gave
`11.4 mm`, so eight was necessary. Going to ten moves the search from 15 to 19
dimensions with no guaranteed gain — a larger space contains better optima and
is harder to search, and which effect wins is an empirical question, not a
theoretical one.

The honest procedure is to run the size you think you need and one size either
side, and compare measured results. That is why the mechanism size is a control
in the interface rather than a constant in the source.

## 46.5 “The path does not close.”

Check, in this order: the warm-up lap (the first frames of a run start from an
arbitrary seed and are not part of the steady cycle), the assembly-jump counter
(a single branch flip breaks closure completely), and whether any frame failed
to solve at all.

In closed form with correct branch tracking, path closure should sit around
`1e−14` — machine precision. A closure error of `0.5 mm` is not a tolerance
issue; it means something in the branch logic is wrong.

## 46.6 “My motor is not enough.”

Split the torque into its three Lagrange terms and look at which one dominates
(§28.1). The three have different remedies and applying the wrong one wastes
money:

- **Gravity `U'` dominates** → counterweight or spring balance (§29).
- **`M·θ̈` dominates** → a flywheel, or a gentler speed profile.
- **`½M'θ̇²` dominates** → the reduced inertia varies too much through the
  cycle. Fix the geometry or lower the speed. A flywheel does **not** reduce
  this term — it smooths the *speed* variation the term causes, while the
  torque the motor must deliver is unchanged.

## 46.7 “Which error measure should I use?”

Point-to-point if timing matters — if the output must be at a particular place
at a particular crank angle. Symmetric Chamfer for shape, when only the traced
figure matters. Hausdorff for reporting the worst deviation, which is what a
tolerance is about. Fourier descriptors for fast pre-screening of large
populations.

Never one-sided Chamfer: it measures how close your path is to the target
without measuring whether you covered the target, and it scores a mechanism
tracing one lobe of the heart very well indeed.

## 46.8 “Grashof is satisfied but my crank will not rotate.”

Grashof says that *some* link rotates fully; which one depends on the
inversion. If the shortest link is not adjacent to the frame, the fully
rotating link may not be the one you have attached the motor to. §40.1 tabulates
all four inversions of one length set — the same four bars give a crank-rocker,
a double crank and a double rocker depending only on which link is bolted down.

## 46.9 “Several mechanisms trace the same curve — which one do I build?”

They are probably cognates (§18). Kinematic equivalence is not practical
equivalence: choose on pivot locations (does the frame fit the space
available), the length band, the worst transmission angle, interference and
layer count, and tolerance sensitivity. Roberts–Chebyshev guarantees the curves
are identical and guarantees nothing else, so every practical criterion is free
to differ — and usually does, substantially.

## 46.10 “Should I trust an RMS of 4 mm over an RMS of 6 mm?”

Not without looking at the rest of the report. RMS is one number about the
nominal geometry; it says nothing about whether the mechanism turns, how it
transmits force, or what happens when the parts are made to tolerance.

The ordering that matters is: **does it complete a revolution → does it
transmit force acceptably → does it fit the size and manufacturing limits →
how accurate is it.** A design that wins on the last criterion and loses on any
earlier one is not the better design. §40.9 works through a concrete pair.

## 46.11 “Why closed-form kinematics rather than a general solver?”

Speed and determinism. A closed-form position solution for one frame takes
about `5 µs`; a Newton iteration takes 5–20× longer and can converge to the
wrong branch, fail to converge, or converge to different branches on
neighbouring frames.

Speed matters because synthesis evaluates thousands of candidates over hundreds
of frames each — the difference is between a search that runs interactively and
one that runs overnight (§45.7). Determinism matters more: a solver that
sometimes lands on the other assembly mode produces velocity and inertia data
that are wrong in a way no residual check detects.

The cost is generality. Closed form works because the chain decomposes into
RRR dyads; a topology that does not decompose needs a numerical solver, and
then all of the above becomes the price of admission.

## 46.12 “How do I know a reported number is real?”

Ask where it came from. In a well-built tool that question has an answer for
every number: this one is measured by re-running the solver, this one is a
stored result from a recorded run, this one is a specification target.

The specific failure to guard against is a plausible number with no
provenance — typed in once as an estimate, never corrected, and indistinguishable
from a measured result thereafter (§45.5). The defences are architectural rather
than procedural: store solver output rather than transcribed values, have the
test suite re-derive stored metrics, label initial guesses distinctly from
optimised results, and re-measure rather than re-run when a definition changes.

---

# 47. Glossary

**Assur group** — A portion of a chain with zero DOF when attached to the frame,
not divisible into smaller such portions. The smallest is the dyad, and Assur
decomposition is what makes closed-form solution of a long chain possible.

**Backlash** — Free play between pin and hole in a joint, producing position
uncertainty whose sign depends on the direction of travel. Unlike a length
error, it cannot be calibrated out.

**Base circle** — In cam design, the smallest circle of the cam profile.
Enlarging it reduces the pressure angle at the cost of size.

**Branch** — A region within a circuit reachable without passing a singularity.
A mechanism that changes branch mid-revolution has not moved; it has been
reassembled.

**Burmester curves** — In four-position synthesis, the loci of concyclic coupler
points (circle-point curve) and their centres (centre-point curve). Both are of
third degree.

**Chamfer distance** — RMS of nearest-point distances from one curve to another.
The **symmetric** form measures both directions and is the only form safe for
path synthesis.

**Circuit** — The set of configurations reachable without disassembly. A
mechanism may have several; only one of them is the machine you built.

**Cognate** — A different mechanism tracing the same coupler curve. Every
four-bar has two, given by the Roberts–Chebyshev theorem.

**Compliant mechanism** — One that produces motion by elastic deformation rather
than by joints.

**Contact ratio** — In gearing, the average number of tooth pairs in contact.
Must exceed 1; `1.4` or more is targeted.

**Coupler** — The link connecting two moving links; it undergoes general planar
motion (neither pure rotation nor pure translation).

**Coupler curve** — The path traced by a point on the coupler. Of sixth degree
for a four-bar, which is the source of its surprising variety.

**Dead point** — A configuration where input motion cannot drive the output;
`μ = 0°` or `180°`.

**Dwell** — An interval during which the output remains stationary while the
input continues to move.

**Dyad** — A two-link, three-joint Assur group: RRR, RRP, RPR, PRP, RPP. The
RRR dyad is the building block of every mechanism in this application.

**Freudenstein's equation** — The four-bar closure written in terms of angles;
linear in the coefficients `K₁, K₂, K₃`, which is what makes three-position
function synthesis a linear problem.

**Grashof condition** — `s + l ≤ p + q`; the condition for full rotation of at
least one link. Which link rotates depends on the inversion.

**Ground (frame)** — The link taken as fixed. Choosing a different one gives an
inversion.

**Higher pair** — A joint with line or point contact (cam, gear). Contrast lower
pair, with surface contact.

**Instant centre** — The point about which two bodies' relative motion is
instantaneously a pure rotation. There are `n(n−1)/2` of them in an `n`-link
mechanism.

**Inversion** — Fixing a different link of the same kinematic chain. The chain
is unchanged; the mechanism is different.

**Jacobian** — The matrix of partial derivatives `∂F/∂q` of the closure
equations. Singularities are where it loses rank.

**Jerk** — The derivative of acceleration. Discontinuous jerk excites structural
resonance and is the main cause of noise in cam-driven machinery.

**Kinematic chain** — An assembly of links and joints, considered before any
link is chosen as the frame.

**Link** — A rigid body in a mechanism. Binary, ternary or quaternary according
to how many joints it carries.

**Loop-closure residual** — The extent to which the closure equations fail to be
satisfied. In a closed-form solution it is an independent verification rather
than a convergence criterion.

**Lower pair** — A joint with surface contact: revolute, prismatic, helical,
cylindrical, spherical, planar.

**Mobility (`M`)** — Degrees of freedom; the number of independent variables
needed to fix the configuration of a mechanism.

**Module (`m`)** — In gearing, the size parameter `d/z`. Two gears mesh only if
they share a module and pressure angle.

**Overconstraint** — A chain with more constraints than its motion requires,
whose mobility formula therefore understates its true freedom. See the Bennett
linkage.

**Pantograph** — A parallelogram-based linkage that scales a motion by a fixed
ratio.

**Passive freedom** — A relative motion that exists but does not affect the
output, such as a connecting rod's spin about its own axis in an RSSR chain.

**Precision point** — A point through which the synthesised mechanism must pass
exactly. Between precision points, the structural error is whatever it is.

**Pressure angle** — In cam design, the angle between the contact normal and the
follower's motion. The cam analogue of the transmission angle, with the good
case being small rather than large.

**Procrustes alignment** — The transform best superimposing two point sets. The
**rigid** form contains rotation and translation only, never scale; a scaled
alignment silently accepts a mechanism of the wrong size.

**Pseudo-rigid-body model (PRBM)** — A representation of a flexible beam as a
revolute joint plus a torsional spring, which lets rigid-body synthesis methods
be applied to compliant design.

**Quick return** — A mechanism whose forward and return strokes take different
times. Measured by the time ratio `Q`.

**Reduced inertia (`M(θ)`)** — The whole mechanism's equivalent inertia as seen
at the motor shaft. Configuration-dependent, and the central quantity in 1-DOF
dynamics.

**Revolute pair** — A pin joint; one rotational freedom. Written `R`.

**Shaking force** — The net inertia force that moving masses transmit to the
frame.

**Singular value (`σ`)** — Square root of an eigenvalue of `JᵀJ`. The smallest,
`σ_min`, measures proximity to singularity and, unlike the determinant, does not
scale with the mechanism's size.

**Slider (prismatic pair)** — A joint permitting one translational freedom.
Written `P`.

**Structural error** — The deviation that remains between precision points in a
synthesised mechanism. It is not a manufacturing error; it is inherent in
fitting a finite mechanism to an arbitrary specification.

**Ternary link** — A link carrying three joints. In this application its third
point is parameterised in polar coordinates relative to the link's own axis.

**Time ratio (`Q`)** — Ratio of forward to return stroke duration; `Q > 1`
indicates quick return.

**Toggle** — A configuration approaching collinearity where mechanical advantage
grows without bound and output velocity goes to zero. A singularity used
deliberately.

**Transmission angle (`μ`)** — The angle between coupler and output link,
measuring how effectively force is transmitted. `90°` is ideal; the effective
value is `min(μ, 180 − μ)`.

**Twist / wrench** — In screw theory, the representation of an instantaneous
motion and of a load respectively. Reciprocity between them gives constraint
analysis.

**Warm-up lap** — A discarded first revolution run to bring the solver's branch
state into the steady cycle before any measurement is taken.

---

# 48. Symbols and units

## 48.1 Symbols

| Symbol | Meaning | Unit |
|---|---|---|
| `a, b, c, d` | Four-bar link lengths | mm |
| `s, l, p, q` | Shortest, longest and intermediate lengths (Grashof) | mm |
| `n`, `j`, `L`, `M` | Links, joints, loops, mobility | — |
| `j₁`, `j₂` | Lower pairs, higher pairs | — |
| `N` | Number of dyads | — |
| `r, α` | Polar coordinate of a ternary third point | mm, ° |
| `θ`, `ω`, `α` | Angle, angular velocity, angular acceleration | rad, rad/s, rad/s² |
| `θ₂` | Input (crank) angle | rad |
| `μ` | Transmission angle | ° |
| `μ_eff` | Effective transmission angle, `min(μ, 180−μ)` | ° |
| `μ_s`, `f` | Coefficient of friction | — |
| `J` | Constraint Jacobian, or objective value | — |
| `σ_min`, `κ` | Smallest singular value, condition number | — |
| `m`, `ρ_line` | Mass, line density | kg, kg/mm |
| `c` | Centre of gravity position | mm |
| `I_c`, `I_P` | Inertia about the CoG, about another point | kg·m² |
| `M(θ)` | Reduced (effective) inertia | kg·m² |
| `U`, `T`, `τ` | Potential energy, kinetic energy, torque | J, J, N·m |
| `Q` | Generalised force, or time ratio | N·m, — |
| `g` | Gravity, `(0, −9.80665)` | m/s² |
| `C_s` | Coefficient of speed fluctuation | — |
| `F`, `CR` | DE scale factor, crossover rate | — |
| `K₁, K₂, K₃` | Freudenstein coefficients | — |
| `ε` | Contact ratio (gearing) | — |
| `z`, `m` | Tooth count, module (gearing) | —, mm |
| `h`, `β` | Cam lift, cam angular interval | mm, rad |
| `γ`, `K_Θ` | PRBM radius factor, stiffness coefficient | — |
| `L₁₀` | Bearing life at 90% reliability | revolutions |

## 48.2 Conversions

```
1 mm = 1e−3 m            1 rpm = 0.10472 rad/s
1 g  = 1e−3 kg           1 N·mm = 1e−3 N·m
1 kg·mm² = 1e−6 kg·m²    1° = 0.017453 rad
1 rad = 57.2958°         1 Hz = 6.28319 rad/s
```

## 48.3 The units rule

**Geometry and interface in millimetres; all dynamics in SI.** Every conversion
must pass through a single module.

The reason for the split is that neither convention is right for both halves.
Millimetres are what a workshop reads and what a screen draws; SI is what the
dynamics formulas assume. Choosing one and converting everywhere gives clean
formulas and unreadable geometry, or the reverse. Choosing both and funnelling
the conversion through one place gives both — provided the funnel really is one
place, which is a property to be tested rather than intended (§25.4).

---

# 49. References and further reading

## 49.1 Core textbooks

Norton, *Design of Machinery* — applied, with worked examples throughout; the
best first book.
Uicker, Pennock & Shigley, *Theory of Machines and Mechanisms* — classical,
particularly good on instant centres and dynamics.
Erdman, Sandor & Kota, *Mechanism Design: Analysis and Synthesis* —
synthesis-heavy, with the fullest accessible treatment of Burmester theory.
Hartenberg & Denavit, *Kinematic Synthesis of Linkages* — the source text for
much of the classical synthesis apparatus.
Söylemez, *Mekanizma Tekniği* — the standard Turkish text.

## 49.2 Advanced

McCarthy & Soh, *Geometric Design of Linkages*.
Angeles, *Fundamentals of Robotic Mechanical Systems*.
Merlet, *Parallel Robots* — the reference on parallel architectures and their
singularities.
Howell, *Compliant Mechanisms* — the source of the PRBM coefficients.
Davidson & Hunt, *Robots and Screw Theory*.
Tsai, *Mechanism Design: Enumeration of Kinematic Structures* — systematic
topological enumeration.

## 49.3 Atlases

Hrones & Nelson, *Analysis of the Four-Bar Linkage* (1951) — thousands of
plotted coupler curves; the pre-computational answer to path synthesis, and
still useful for developing intuition about what shapes are reachable.
Artobolevsky, *Mechanisms in Modern Engineering Design*, 5 volumes — the
encyclopaedic mechanism catalogue.

## 49.4 Numerical methods

Storn & Price, *Differential Evolution* (1997).
Hansen, *The CMA Evolution Strategy: A Tutorial*.
Nocedal & Wright, *Numerical Optimization*.
Golub & Van Loan, *Matrix Computations*.
Sommese & Wampler, *The Numerical Solution of Systems of Polynomials* —
homotopy continuation, the systematic route to all solutions of a synthesis
problem rather than one.

## 49.5 Curve comparison

Umeyama, *Least-Squares Estimation of Transformation Parameters Between Two
Point Patterns* — the closed-form rigid alignment used here.
Borgefors, *Hierarchical Chamfer Matching*.
Ullah & Kota, *Optimal Synthesis of Mechanisms for Path Generation Using
Fourier Descriptors and Global Search Methods*.

## 49.6 Limits of this document

Out of scope: finite-element stress analysis, lubrication theory and tribology
in detail, control theory for servo-driven mechanisms, materials science and
fatigue-life computation, and the full algebraic synthesis of spatial
mechanisms.

For critical applications, a design produced with the methods here must still
pass detailed engineering verification. **That a mechanism is kinematically
valid does not show that it is manufacturable or durable** — kinematics is a
necessary condition and never a sufficient one.

---

*This reference ships with KREAMET and gives the theoretical basis for every
method the application uses. Every number the app reports is computed against
the criteria defined here.*

> **A note on the two versions.** This reference exists in Turkish and English,
> with the same 49 chapters in the same order. The two are written
> independently rather than translated line by line, so the emphasis and the
> examples differ in places; where they differ in a matter of fact, that is a
> defect and worth reporting.
