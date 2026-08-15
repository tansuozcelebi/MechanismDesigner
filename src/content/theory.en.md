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

## 25.2 Centre of gravity and inertia

For a uniform binary link, `c = (A + B)/2`. For a composite body, take the
mass-weighted mean of the parts.

For a thin rod of length `L` and mass `m` about its own centre:

```
I_c = m·L² / 12
```

and the parallel axis theorem moves it: `I_P = I_c + m·d²`.

## 25.3 Units

Kinematics works in millimetres, dynamics in SI. Mixing them is the most common
error class: entering millimetres into `I = m·L²/12` inflates the result by
`1e6`. Passing every conversion through one module (`utils/units.ts` here)
eliminates the class entirely.

## 25.4 Reduced (effective) inertia

In a 1-DOF mechanism all motion is parameterised by `θ`. The kinetic energy
becomes:

```
T = ½ · M(θ) · θ̇²
M(θ) = Σ ( m_i · |∂p_i/∂θ|² + I_i · (∂φ_i/∂θ)² )
```

`M(θ)` is the **reduced inertia**: the whole mechanism's equivalent inertia as
seen at the motor shaft. It depends on configuration, and it is the single most
important concept in 1-DOF mechanism dynamics.

The derivatives are taken by finite differences — with branch seeding, or the
result is meaningless. A large variation in `M(θ)` means the motor must supply a
varying torque even at constant speed, which produces vibration.

---

# 26. Static force analysis

## 26.1 Free-body equations

Per link, `ΣF = 0` and `ΣM = 0` — three equations in the plane. For a 1-DOF
mechanism the count works out exactly: `3(n−1) = 2j + 1`, matching the joint
reactions plus the input torque. That is the static counterpart of the mobility
formula and a pleasant consistency check.

## 26.2 Two-force members

A link with only two joints and no external load carries force along the line
joining them. This simplifies analysis greatly: the **direction** is known and
only the magnitude is sought. In a four-bar the coupler is usually a two-force
member.

## 26.3 Virtual work

For a 1-DOF mechanism all virtual displacements are proportional to `δθ`, so:

```
T_in = − Σ ( F_i · ∂p_i/∂θ + M_i · ∂φ_i/∂θ )
```

No joint forces are computed at all. For motor selection this is all you need.

## 26.4 Gravity torque

With `F_i = m_i·g` and `g = (0, −9.80665)` m/s²:

```
U(θ) = Σ m_i · g · h_i(θ)
T_gravity = dU/dθ
```

## 26.5 The closed-loop integral is zero

`U(θ)` is single-valued on a closed path, so:

```
∮ (dU/dθ) dθ = U(2π) − U(0) = 0
```

Gravity does zero net work over a revolution. This is a very useful check: if
your `dU/dθ` is wrong, the integral will not vanish. KREAMET's test suite
asserts `|∫| < 1e−3`.

## 26.6 Finite-difference verification

A second, independent check compares the analytic (virtual work) result against
a direct finite difference of `U`, requiring agreement to about `1e−6`. Both
tests passing is strong evidence that the dynamics layer is correct.

## 26.7 Joint reactions

Bearing selection needs reaction forces, obtained by solving link by link from
output to input. The maximum reaction usually occurs where the **transmission
angle is worst** — forces blow up near singularity. That is the direct link
between the `μ` lower bound and bearing life.

---

# 27. Dynamics: Newton–Euler

Per link: `ΣF = m·a_c` and `ΣM_c = I_c·α`.

Solution order: solve the kinematics first (position, velocity, acceleration),
compute the inertia terms, then balance link by link from output to input; the
torque left at the input link is what the motor must supply.

**d'Alembert's principle** turns this into a statics problem by adding
`F_inertia = −m·a_c` and `M_inertia = −I_c·α` as external loads, which lets the
static methods be used directly.

Newton–Euler gives all joint reactions — necessary for bearings, pins and body
strength — but requires assembling and solving a system. If only motor torque is
wanted, Lagrange's method is far shorter.

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

## 28.2 The second term matters

`½·M'(θ)·θ̇²` is frequently omitted, which is badly wrong for mechanisms running
at constant speed. At constant speed `θ̈ = 0` and the first term vanishes — yet
the motor must still apply torque, because the reduced inertia is changing.

Physically: as the mechanism "opens", inertia rises and energy must be supplied
to hold speed; as it "closes", inertia falls and energy comes back.

## 28.3 Flywheel sizing

```
I_flywheel = ΔE_max / (C_s · ω_mean²)
```

with `ΔE_max` the largest energy excess in a revolution and `C_s` the accepted
speed fluctuation coefficient (typically 0.02–0.05).

## 28.4 Motor selection

The motor must supply the peak torque `max|Q(θ)|`, the RMS torque (which sets
heating), and the peak power `max|Q·ω|`. With a gearbox of ratio `i`, reduced
inertia at the motor divides by `i²` and torque by `i`; the optimal ratio is
near `i_opt ≈ sqrt(M_load / I_motor)`.

KREAMET computes the three Lagrange terms separately and displays them
separately: knowing which term dominates decides whether the answer is a
flywheel, a counterweight or a lighter body.

---

# 29. Gravity torque and balancing

A mechanism is **statically balanced** if `U(θ)` is constant, so `dU/dθ = 0`
everywhere; the motor then only has to overcome inertia and friction.

Methods:

- **Counterweights.** Simple, but they raise total mass and therefore inertia,
  worsening dynamic loads.
- **Spring balancing.** A **zero-free-length spring** has `U = ½k|r|²` and can
  cancel gravitational potential exactly, with no added mass. Preferred in
  robotics and rehabilitation devices.
- **Parallelogram linkages.** Keep a link's orientation fixed and allow a
  counterweight to be placed far away.

**Partial balancing** is usually the practical choice: adding 10–20% of the mass
typically removes 60–80% of the peak torque.

KREAMET measures the peak `|dU/dθ|` over the revolution and includes it with a
deliberately small weight (`0.05`). At this scale (150–250 mm, a few hundred
grams) gravity torque is a small effect and should not dominate the design; it
is measured so that, between two kinematically equal designs, the one needing
less torque wins. The measured peak for the shipped design is `0.24 N·m`.

---

# 30. Mass balancing (shaking force and moment)

Moving masses transmit oscillating force and moment to the frame:

```
F_shaking = Σ m_i · a_ci
M_shaking = Σ ( I_i·α_i + r_i × m_i·a_ci )
```

**Full force balance** requires the total centre of gravity to stay fixed. The
Berkof–Lowen method gives counterweight masses and positions in closed form for
a four-bar. The cost is heavy: added mass is typically 2–4× the original, so
total inertia and motor torque rise.

**Moment balance** requires more: a counter-rotating inertia disc, a second
mirror-symmetric mechanism (the cleanest solution — the two cancel each other),
or a geared balance shaft.

In industry full balancing is rare. The usual route is partial balancing to
remove 70–80% of the shaking force, isolation for the remainder, and staying
away from critical speeds. Harmonic analysis helps: the first harmonic is
usually largest and can be cancelled with one counterweight; the second requires
a balancer running at twice the speed, as in internal-combustion engines.

---

# 31. Friction, efficiency and bearings

Joint friction torque is `M_f = μ_s · R_bearing · F_reaction`.

| Bearing type | `μ_s` |
|---|---|
| Dry plastic on steel | 0.15–0.30 |
| Lubricated bronze bush | 0.05–0.12 |
| Ball bearing | 0.001–0.005 |
| Needle bearing | 0.002–0.006 |

Efficiency is high with revolute joints (90–98%), lower with sliders (70–90%),
and can be very low with screws (20–50%), where self-locking occurs.

Because joint force grows as `1/sin(μ)`, so does friction torque: `μ = 45°`
costs `1.41×` relative to `90°`, and `μ = 20°` costs `2.9×`. That is the
efficiency argument for the transmission-angle limit.

Bearing life follows `L₁₀ = (C/P)³ · 10⁶` revolutions for ball bearings, with
the cubic-mean load used when `P` varies through the revolution.

---

# 32. Cam mechanisms

## 32.1 When to use a cam

Linkages produce analytic motion and cannot deliver **every** motion law. A cam
is cut directly to the law, giving exact dwells, asymmetric acceleration
profiles and arbitrary position–time relations. The price is higher-pair
contact: Hertzian stress, wear, and one-directional force (needing a spring or a
grooved cam for the return).

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

## 32.3 Pressure angle and curvature

```
tan(α) = (ds/dθ) / (r_prime + s)
```

Keep `α ≤ 30°` for a translating follower. Reduce it by enlarging the base
circle, at the cost of a bigger cam and higher surface speed.

The profile's radius of curvature must exceed the follower roller radius, or
**undercutting** occurs and the follower cannot track the intended motion.

## 32.4 Cam or linkage

| Criterion | Cam | Linkage |
|---|---|---|
| Freedom of motion law | Total | Limited (analytic curves) |
| Exact dwell | Easy | Approximate (six-bar) |
| Wear | High | Low |
| Speed capability | Moderate | High |
| Manufacture | CNC required | Hole and pin suffice |
| Load capacity | Limited (Hertz) | High |

KREAMET's problem is specified **cam-free** — a deliberate choice favouring wear
resistance and speed capability, and the main constraint that makes the design
hard.

---

# 33. Gears and gear trains

The fundamental law of gearing requires the common normal at the contact point
to pass always through the pitch point. The profile family that achieves this is
the **involute**, whose decisive advantage is **centre-distance tolerance**: the
ratio is unaffected if the centres shift slightly.

Basic quantities:

```
m   = d / z          module (mm)
p   = π·m            pitch
d_b = d·cos(α)       base circle
d_a = d + 2m         addendum circle
d_f = d − 2.5m       dedendum circle
```

with a standard pressure angle `α = 20°`.

The **contact ratio** `ε` must exceed 1, or motion is interrupted; `ε ≥ 1.4` is
targeted in practice. The minimum tooth count without undercutting is
`z_min = 2/sin²(α) = 17` at `20°`, relaxed by profile shift.

Gear trains:

- **Simple:** `i = z_out / z_in`; idlers change direction only.
- **Compound:** `i = (z₂·z₄)/(z₁·z₃)`, needed for ratios above about 10.
- **Epicyclic:** Willis's equation
  `(ω_sun − ω_carrier)/(ω_ring − ω_carrier) = −z_ring/z_sun`, giving very high
  ratios in a compact, coaxial package.

In mechanism design gears appear in three roles: reduction, phase locking of two
mechanisms, and gear-driven linkages. The third is powerful: a five-bar has
`M = 2`, but coupling its two inputs through a gear pair makes it `M = 1` with a
far richer curve family than a four-bar.

---

# 34. Spatial and spherical mechanisms

If all joint axes intersect at one point, every point moves on a sphere about
it: a **spherical mechanism**, the spherical analogue of a planar one, to which
most planar theory transfers with "lengths" becoming angles.

The **universal (Hooke) joint** is a spherical four-bar whose speed ratio is not
constant:

```
ω₂/ω₁ = cos β / (1 − sin²β·cos²θ₁)
```

Fluctuation grows quickly with the shaft angle `β`: about `±3.5%` at 15° and
`±15%` at 30°. Constant-velocity joints remove it by pairing two Hooke joints in
phase or using a Rzeppa-type ball arrangement.

**RSSR** is the most common spatial four-bar: two revolutes and two spherical
joints. The formula gives `M = 2`, one of which is the connecting rod's passive
spin. It tolerates misalignment well and does not require parallel axes — which
planar mechanisms cannot manage.

**Denavit–Hartenberg** parameters (`a`, `α`, `d`, `θ`) standardise spatial link
geometry, with `T_i = Rot_z(θ)·Trans_z(d)·Trans_x(a)·Rot_x(α)`. For closed
chains the loop closure becomes `T₁T₂…T_n = I`, which is hard to solve.

**Screw theory** describes instantaneous motion as a twist (rotation plus
translation on an axis) and load as a wrench, with reciprocity giving constraint
analysis. It determines mobility and singularity far more reliably than
Grübler's formula, especially for overconstrained mechanisms — such as the
**Bennett linkage**, a four-R spatial chain that moves with one freedom despite
`M = −2`, provided `a₁ = a₃`, `a₂ = a₄`, `a₁/sin α₁ = a₂/sin α₂` and all offsets
are zero.

Design advice: use S joints where possible for their passive freedom; avoid
overconstraint unless deliberate; solve spherically when the problem allows;
and include assembly tolerance in simulation, because a spatial mechanism that
works at nominal geometry can jam in reality.

---

# 35. Parallel mechanisms

A **serial** chain connects the end effector to the base through one path: large
workspace, easy forward kinematics, low stiffness. A **parallel** mechanism uses
several independent chains: high stiffness and load capacity, low moving mass,
small workspace, and — the reverse of serial robots — **easy inverse kinematics,
hard forward kinematics**.

- **Stewart–Gough platform:** six variable-length legs, six DOF. Inverse
  kinematics is trivial; forward kinematics is a 40th-degree polynomial.
- **Delta robot:** three arms with parallelogram linkages; the end effector keeps
  a fixed orientation and only translates. Very fast, because the motors stay on
  the fixed base.
- **Planar 5-bar:** two cranks driving a common point. `M = 2`, two motors, any
  planar path.

That last one is the "easy" alternative to KREAMET's problem, and shows why it
was rejected: with two motors any curve can be drawn, the synthesis problem
disappears — and a synchronisation problem appears. A single-motor solution is
qualitatively different because it embeds the motion in geometry.

**Singularities** in parallel mechanisms come in three types (Gosselin–Angeles):
Type 1 at the workspace boundary; Type 2 **inside** the workspace, where the end
effector can move with the actuators locked — dangerous, because control is lost
and forces blow up; and Type 3, architecture-specific. Type 2 is the main risk
distinguishing parallel from serial mechanisms and must be mapped when defining
the workspace.

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
must be exempted, as must different members of the same body.

## 36.2 A measured result: no coplanar solution exists

During KREAMET's development, in-plane interference was measured over 454
**valid** mechanisms (full rotation, every member within the length band).

**None was free of coplanar interference.** The rate was zero.

The cause is structural: three closed loops and fifteen 12 mm bars in one plane
must cross one another. A criterion treating interference as fatal — as the
original specification did — would have rejected **every** mechanism, including
the sound ones.

## 36.3 The layered assembly model

Real multi-loop mechanisms, especially 3D-printed and laser-cut ones, are built
in **stacked parallel planes**. The fix is to model that:

1. Determine which bar pairs interfere over the revolution.
2. Build an **interference graph**: nodes are bodies, edges are interferences.
3. Colour the graph. Same colour = same layer.
4. The number of colours is the number of parallel planes required.

Optimal colouring is NP-hard; the **Welsh–Powell** greedy heuristic (sort nodes
by descending degree, then assign each the smallest colour unused by its
neighbours) is usually optimal at mechanism scale (8–14 nodes).

## 36.4 The cost of layers

More layers means longer pins (a joint bridging `k` layers needs a pin `k`
layers long, and long pins bend, producing joint angle error), a thicker stack
(the mechanism departs from planarity and out-of-plane moments appear), and
harder assembly.

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

---

# 37. Tolerances, backlash and error analysis

Error sources and typical magnitudes:

| Source | Magnitude | Effect |
|---|---|---|
| Link length tolerance | ±0.05–0.2 mm | Systematic path deviation |
| Joint clearance | 0.05–0.3 mm | Random position uncertainty |
| Bearing clearance | 0.01–0.05 mm | Random |
| Elastic deformation | Load-dependent | Load-varying deviation |
| Thermal expansion | `α·ΔT·L` | Slow drift |
| Assembly error | ±0.1–0.5 mm | Systematic |

**Sensitivity** `S_i = ∂P/∂x_i` is taken by finite differences, and total error
follows either as a worst-case sum or, more realistically, as
`sqrt(Σ (S_i·Δx_i)²)`.

Sensitivity is where design decisions really bite. Two mechanisms can trace the
same nominal path with very different sensitivities: one working near a
singularity amplifies a small length error, because the sensitivity terms scale
as `1/σ_min`. In a measured example, a four-bar with `∂P/∂b ≈ 1.8` turned into
`∂P/∂b ≈ 8.6` when driven near `μ_min = 12°` — five times worse from the same
tolerance.

That is the **third** justification for the transmission-angle limit, alongside
efficiency and functionality: **precision**. A design with slightly worse curve
error but a much better transmission angle usually performs better in real
manufacture. Chasing the last fraction of nominal RMS is misleading.

For large tolerances the linear estimate is inadequate and **Monte Carlo**
(typically `10⁴` samples) gives the real distribution — affordable with a
closed-form solver.

Tolerance costs rise steeply as they tighten, so run the sensitivity analysis
first and tighten only the **high-sensitivity** parameters; in a typical
mechanism two or three parameters produce 80% of the error. Systematic error can
also be removed by **calibration**: measure a few poses of the real mechanism,
fit the parameters to the measurements, and use the fitted values.

---

# 38. Compliant mechanisms

Compliant mechanisms produce motion by **elastic deformation** rather than
joints. They have no backlash, no friction and no lubrication; they can be made
monolithically, so there is no assembly; and they get more advantageous as scale
shrinks (they dominate in MEMS). Against that: limited range, stored energy
(a restoring force), finite fatigue life, and non-linear large-deflection
analysis.

Two kinds: **lumped** compliance (thin "living hinges" between rigid bodies,
behaving close to rigid-body theory) and **distributed** compliance (the whole
body flexes — longer life because strain spreads, harder to analyse).

The **pseudo-rigid-body model (PRBM)** represents a flexible beam as a revolute
joint plus a torsional spring, with a characteristic radius factor `γ ≈ 0.85`
and stiffness coefficient `K_Θ ≈ 2.65` for an end-loaded cantilever. This lets
rigid-body synthesis tools be applied: design rigid first, then size the
compliant equivalent.

Maximum stress is `σ_max = E·c/ρ_min`, which must stay below the fatigue limit
divided by a safety factor of 2–3. This bounds the range of motion directly:
larger motion means smaller radius of curvature means higher stress. Materials
with a high `σ_yield/E` ratio are wanted — titanium, spring steel,
polypropylene, nylon.

**Bistable** compliant mechanisms have two energy minima and are used for
switches, latches and deployable structures.

KREAMET produces rigid mechanisms because the target is a fully rotating motion
at 250 mm scale — far beyond the range and fatigue limits of compliant designs.

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

# 40. Common mistakes

**Counting and topology.** Leaving the frame out of `n`; counting a multi-link
pin as a single joint; counting a welded connection as a joint; treating
Grübler's formula as infallible where overconstraint or passive freedoms exist.

**Analysis.** Ignoring branch continuity; fixing the root by sign instead of
proximity; taking finite differences without branch seeding (silently wrong
velocities and accelerations); skipping the warm-up lap and then mistaking the
artefact for a real defect; treating a Newton residual as verification;
measuring singularity by `det(J)` alone instead of `σ_min`.

**Synthesis.** Not scaling the objective terms; using similarity (scaled)
Procrustes; using one-sided Chamfer; referencing an unreachable target; ranking
at coarse sampling; repairing every offspring; checking kinematic validity only
after the search instead of inside the objective.

**Manufacture.** Treating links as lines and never checking interference;
treating interference as fatal when layered assembly is the real answer;
verifying only nominal geometry; exempting dependent members from the length
band; mixing units.

**Reporting.** Presenting an unoptimised number as a result; giving averages
where the worst case is what matters; presenting partial success (`335/720`
frames) as partial quality — it is a mechanism a motor cannot turn.

---

# 41. Design checklist

**Topology.** `n` and `j` counted correctly, multi-link pins included;
`M = 3(n−1) − 2j₁ − j₂` computed and equal to 1; mobility verified independently
from the constructed graph; incidence consistent (`Σ deg = 2j`); no
disconnected body; `L = j − n + 1` computed.

**Kinematics.** Every frame of the revolution solves; zero assembly-mode jumps;
loop closure below tolerance; path closure below tolerance; warm-up lap
performed; the input link genuinely rotates fully.

**Force transmission.** `μ` computed for every dyad over the cycle; the worst
`μ_eff` reported and above the project limit; the analytic ceiling computed and
the target referenced to an attainable value; `σ_min` tracked; dead points
outside the working range.

**Geometry and manufacture.** Every printed member — including dependent sides —
within the length band; sensible link ratios; in-plane interference measured and
reported; layer count, maximum pin span and stack thickness computed;
hole-to-edge rules satisfied.

**Dynamics.** Mass model defined and documented; reduced inertia computed; peak
gravity torque measured; closed-loop integral check passed; finite-difference
check passed; motor peak and RMS torque computed; flywheel sized if needed.

**Precision.** Sensitivities computed for the critical parameters; tolerance
budget allocated; backlash effect estimated; Monte Carlo run where warranted.

**Reporting.** Initial guess and optimised result clearly separated; the code
that produced each number identified; worst-case values given; unmet targets
stated explicitly; the design file (topology + parameters + constraints)
exported.

---

# 42. Frequently asked questions

**"It works in simulation but jams in reality."** In order of likelihood: the
transmission angle is too small (simulation is frictionless; reality self-locks
when `tan(μ_eff) < f`); the assembly is overconstrained (out-of-plane
misalignment binds it — an S joint or added clearance fixes it); two bodies share
a layer and cross; or long pins are bending under load.

**"The optimiser finds a good curve but the mechanism looks strange."** The
objective is not measuring something you care about. Check link ratios,
interference, transmission-angle weight and the size term. "Looks strange"
usually means an unmeasured constraint is being violated.

**"The optimisation stalls."** The seed population may be invalid (use
constructive sampling); the penalty band may be flat (add the violation
magnitude); repair may be over-applied (rescue only); or a reference value may
be unattainable.

**"How many links should I use?"** More links mean richer curves but more
backlash, more friction, more layers, higher cost and a bigger search space. Use
the fewest that reach acceptable error. Measured here: six bars gave `55 mm`
RMS for the heart while eight gave `11.4 mm`, so eight was necessary; going to
ten moves the search from 15 to 19 dimensions with no guaranteed gain.

**"The path does not close."** Check the warm-up lap, the assembly-jump counter,
and whether any frame failed to solve. In closed form with correct branch
tracking this should sit at `1e−14`.

**"My motor is not enough."** Split the torque into its three Lagrange terms. If
gravity dominates, use a counterweight or spring balance. If `M·θ̈` dominates,
consider a flywheel or a gentler speed profile. If `½M'θ̇²` dominates, the
reduced inertia varies too much — fix the geometry or lower the speed; a
flywheel does **not** reduce this term.

**"Which error measure?"** Point-to-point if timing matters; symmetric Chamfer
for shape; Hausdorff for reporting the worst deviation; Fourier for fast
pre-screening. Never one-sided Chamfer.

**"Grashof is satisfied but my crank will not rotate."** Grashof says *a* link
rotates fully; which one depends on the inversion. If the shortest link is not
adjacent to the frame, the fully rotating link may not be your input.

**"Several mechanisms trace the same curve — which one?"** They are probably
cognates. Choose on pivot locations, length band, transmission angle,
interference and tolerance sensitivity. Kinematic equivalence is not practical
equivalence.

---

# 43. Glossary

**Assur group** — A portion of a chain with zero DOF when attached to the frame,
not divisible into smaller such portions. The smallest is the dyad.

**Backlash** — Free play between pin and hole in a joint, producing position
uncertainty.

**Branch** — A region within a circuit reachable without passing a singularity.

**Burmester curves** — In four-position synthesis, the loci of concyclic coupler
points (circle-point curve) and their centres (centre-point curve). Third
degree.

**Chamfer distance** — RMS of nearest-point distances from one curve to another.
The symmetric form measures both directions.

**Circuit** — The set of configurations reachable without disassembly.

**Cognate** — A different mechanism tracing the same coupler curve. Every
four-bar has two.

**Coupler** — The link connecting two moving links; it undergoes general planar
motion.

**Dead point** — A configuration where input motion cannot reach the output;
`μ = 0°` or `180°`.

**Dwell** — An interval where the output remains stationary while the input
moves.

**Dyad** — A two-link, three-joint Assur group: RRR, RRP, RPR, PRP, RPP.

**Freudenstein's equation** — The four-bar closure written in angles; linear in
`K₁, K₂, K₃`.

**Grashof condition** — `s + l ≤ p + q`; the condition for full rotation of at
least one link.

**Instant centre** — The point about which two bodies' relative motion is
instantaneously pure rotation.

**Inversion** — Fixing a different link of the same chain.

**Jacobian** — The matrix of partial derivatives `∂F/∂q`; singularities are
where its determinant vanishes.

**Loop-closure residual** — The extent to which the closure equations are not
satisfied. In closed form, an independent verification.

**Mobility (`M`)** — Degrees of freedom; the number of independent variables
needed to fix the configuration.

**Passive freedom** — A relative motion that does not affect the output.

**Precision point** — A point the synthesised mechanism must pass through
exactly.

**Procrustes alignment** — The transform best superimposing two point sets. The
**rigid** form contains rotation and translation only, never scale.

**Reduced inertia (`M(θ)`)** — The whole mechanism's equivalent inertia at the
motor shaft; configuration-dependent.

**Shaking force** — The net inertia force transmitted to the frame by moving
masses.

**Singular value (`σ`)** — Square root of an eigenvalue of `JᵀJ`; `σ_min`
measures proximity to singularity.

**Structural error** — The deviation remaining between precision points.

**Time ratio (`Q`)** — Ratio of forward to return stroke durations; `Q > 1` is
quick-return.

**Transmission angle (`μ`)** — The angle between coupler and output link,
measuring force transmission efficiency; `90°` is ideal.

---

# 44. Symbols and units

| Symbol | Meaning | Unit |
|---|---|---|
| `a, b, c, d` | Four-bar link lengths | mm |
| `n`, `j`, `L`, `M` | Links, joints, loops, mobility | — |
| `N` | Number of dyads | — |
| `r, α` | Polar coordinate of a ternary third point | mm, ° |
| `θ`, `ω`, `α` | Angle, angular velocity, angular acceleration | rad, rad/s, rad/s² |
| `μ` | Transmission angle | ° |
| `J` | Constraint Jacobian, or objective value | — |
| `σ_min`, `κ` | Smallest singular value, condition number | — |
| `m`, `ρ_line` | Mass, line density | kg, kg/mm |
| `I_c`, `M(θ)` | Inertia about the CoG, reduced inertia | kg·m² |
| `U`, `T`, `τ` | Potential energy, kinetic energy, torque | J, J, N·m |
| `g` | Gravity, `(0, −9.80665)` | m/s² |
| `F`, `CR` | DE scale factor, crossover rate | — |
| `K₁, K₂, K₃` | Freudenstein coefficients | — |

```
1 mm = 1e−3 m        1 rpm = 0.10472 rad/s
1 g  = 1e−3 kg       1 N·mm = 1e−3 N·m
1 kg·mm² = 1e−6 kg·m²    1° = 0.017453 rad
```

**Rule:** geometry and interface in millimetres; all dynamics in SI. Conversion
must pass through a single module.

---

# 45. References and further reading

**Core textbooks.** Norton, *Design of Machinery* (applied, worked examples);
Uicker, Pennock & Shigley, *Theory of Machines and Mechanisms* (classical, good
on instant centres and dynamics); Erdman, Sandor & Kota, *Mechanism Design:
Analysis and Synthesis* (synthesis-heavy, Burmester theory); Hartenberg &
Denavit, *Kinematic Synthesis of Linkages*; Söylemez, *Mekanizma Tekniği* (the
standard Turkish text).

**Advanced.** McCarthy & Soh, *Geometric Design of Linkages*; Angeles,
*Fundamentals of Robotic Mechanical Systems*; Merlet, *Parallel Robots*; Howell,
*Compliant Mechanisms*; Davidson & Hunt, *Robots and Screw Theory*; Tsai,
*Mechanism Design: Enumeration of Kinematic Structures*.

**Atlases.** Hrones & Nelson, *Analysis of the Four-Bar Linkage* (1951);
Artobolevsky, *Mechanisms in Modern Engineering Design*, 5 volumes.

**Numerical methods.** Storn & Price, *Differential Evolution* (1997); Hansen,
*The CMA Evolution Strategy: A Tutorial*; Nocedal & Wright, *Numerical
Optimization*; Golub & Van Loan, *Matrix Computations*; Sommese & Wampler,
*The Numerical Solution of Systems of Polynomials*.

**Curve comparison.** Umeyama, *Least-Squares Estimation of Transformation
Parameters*; Borgefors, *Hierarchical Chamfer Matching*; Ullah & Kota, *Optimal
Synthesis of Mechanisms for Path Generation Using Fourier Descriptors*.

## 45.1 Limits of this document

Out of scope: finite-element stress analysis, lubrication theory and tribology
in detail, control theory for servo-driven mechanisms, materials science and
fatigue life computation, and the full algebraic synthesis of spatial
mechanisms.

For critical applications, a design produced with the methods here must still
pass detailed engineering verification. That a mechanism is kinematically valid
does not show it is manufacturable or durable.

---

*This reference ships with KREAMET and gives the theoretical basis for every
method the application uses. Every number the app reports is computed against
the criteria defined here.*

> **A note on the two versions.** The Turkish reference is the full-depth
> document (5000 lines, 49 chapters). This English version covers the same
> material and the same chapter structure more concisely. Where the two differ
> in detail, the Turkish text is the more complete one.
