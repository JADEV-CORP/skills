# SaaS PRD Challenge Framework

Use this to stress-test product requirements documents before development begins. Every section maps to a specific book framework that exposes gaps.

---

## PRD challenge checklist (12 gates)

A PRD must pass all 12 gates before it is ready for development. Each gate references the framework that validates it.

1. **Bounded context identified and named**: The feature belongs to a clearly defined domain with its own model and language. (Evans: DDD)
2. **Top 3 architecture characteristics prioritized**: Scalability, availability, security, performance, maintainability: pick exactly 3. (Richards & Ford: Fundamentals of SA)
3. **Build-Measure-Learn hypothesis stated**: "We believe [change] will result in [outcome] measured by [metric]." One sentence. (Ries: Lean Startup)
4. **Need-payoff framing for user stories**: Each story answers: "How would it help if the user could [outcome]?" Not "As a user I want..." but why it matters. (Rackham: SPIN Selling)
5. **MVP scope with explicit cut list**: What is in AND what is out. If nothing is cut, this is a waterfall spec, not an MVP. (Ries: Lean Startup)
6. **Conceptual model validated**: The user's mental model matches the system behavior. Test with 3-5 users before building. (Norman: Design of Everyday Things)
7. **Cognitive load assessed (trunk test)**: Drop into the key screen cold. Can you tell where you are, what to do, and where to go in 5 seconds? (Krug: Don't Make Me Think)
8. **Visual hierarchy defined**: Primary action, secondary actions, supporting info, all at distinct visual weight levels. (Wathan & Schoger: Refactoring UI)
9. **Pre-mortem failure modes identified**: Imagine it shipped and failed. Top 3 reasons why. These become the risk register. (Product Strategy)
10. **Data model and storage engine justified**: Read/write ratio determines engine choice. Indexing strategy covers top 10 queries. (Kleppmann: DDIA + Schwartz: High Performance MySQL)
11. **API contract with consumer-driven tests**: Service boundaries are verified by contract tests, not just integration tests. (Newman: Building Microservices)
12. **Unit economics impact assessed**: What does this feature cost to build, operate, and support? Does it increase LTV, reduce CAC, or improve retention? (Berman: Financial Intelligence)

---

## Challenged PRD template (7 sections)

Each section includes the standard content plus the challenge layer: the framework-informed questions that expose gaps.

### 1. Problem statement

**Standard:** What problem does this solve? For whom?

**Challenge layer:**
- **Bounded context** (DDD): Which domain does this problem belong to? Is the language consistent with that domain's ubiquitous language?
- **Three levels of problem** (StoryBrand): What is the external problem (tangible)? Internal problem (how the user feels)? Philosophical problem (why this should not exist)?
- **SPIN implication**: What happens if this problem goes unsolved for another 6 months? Quantify the cost of inaction.
- **Contrarian test** (Zero to One): Is there a non-obvious insight behind this problem definition? If everyone agrees it is a problem, the solution space is already crowded.

### 2. Hypothesis and metrics

**Standard:** What do we believe will happen? How will we measure success?

**Challenge layer:**
- **BML hypothesis** (Lean Startup): "We believe [change] will result in [outcome] measured by [metric] within [timeframe]."
- **Primary metric**: One number that defines success. Not three. One.
- **Guardrail metrics**: What must NOT get worse? (e.g., latency must not increase, error rate must stay below X)
- **Innovation Accounting** (Lean Startup): Is the metric actionable (conversion rate) or vanity (total page views)?
- **Kill criteria**: What result would make us abandon this feature? If there is no kill condition, this is a commitment, not an experiment.

### 3. User stories with challenge layer

**Standard:** As a [user], I want [feature] so that [benefit].

**Challenge layer:**
- **Need-payoff reframe** (SPIN): "How would it help [user] if they could [outcome]?" This is the real value statement.
- **Acceptance criteria** must include at least one architecture characteristic validation (e.g., "response time under 200ms for P95")
- **Affordance check** (Norman): Does the interface affordance match the expected action? Would a user know what to do without instructions?
- **Convention audit** (Krug): Does this follow the same pattern as similar features in the product? If not, justify the deviation.

### 4. Architecture and technical design

**Standard:** How will this be built?

**Challenge layer:**
- **Top 3 -ilities** (Fundamentals of SA): What are the non-negotiable architecture characteristics for THIS feature? Justify each.
- **Dependency diagram** (Clean Architecture): Draw the dependency arrows. Do they all point inward? Any outward arrow is a violation.
- **Data model** (DDIA): What is the read/write ratio? This determines storage engine, caching, and replication strategy.
- **Service boundary** (DDD + Newman): Does this feature create a new bounded context or extend an existing one? If extending, does the ubiquitous language still hold?
- **Distributed patterns** (Microservices Patterns): If the feature spans services, what is the saga strategy? Choreography or orchestration? What are the compensating actions?

### 5. Design and UX

**Standard:** What does it look like? How does it feel?

**Challenge layer:**
- **Affordances and signifiers** (Norman): For each interactive element, what action does it afford? What visual signifier communicates that?
- **Visual hierarchy** (Refactoring UI): What is the most important element on each screen? Does size, weight, and color reflect that priority?
- **Cognitive load** (Krug): How many decisions does the user need to make? Each one is friction. Can any be eliminated?
- **Spacing and typography** (Refactoring UI): Is spacing on a constrained scale? Is the type scale consistent? How many font sizes appear?
- **Convention audit** (Krug): Does navigation follow platform conventions? Innovation in features, not in chrome.

### 6. MVP scope

**Standard:** What is in v1?

**Challenge layer:**
- **In list**: What is included, with justification for each item.
- **Cut list**: What is explicitly excluded, with reasoning for each cut. No cut list = no discipline.
- **Riskiest assumption** (Lean Startup): What is the single riskiest assumption? The MVP should test THAT, not build everything.
- **Smallest learning loop**: What is the minimum build that starts generating user data?
- **Definition of "validated"**: What result proves this works? What result kills it?

### 7. Risk and pre-mortem

**Standard:** What could go wrong?

**Challenge layer:**
- **Pre-mortem**: Imagine it is 6 months from now and this feature failed completely. Write down the 3 most likely reasons why.
- **Probability / impact / mitigation**: For each risk, score probability (1-5), impact (1-5), and describe the specific mitigation.
- **Wartime contingency** (Horowitz): If this feature becomes a crisis (data loss, security breach, regulatory issue), what is the response plan?
- **Margin of safety** (Graham): If usage is 50% of projected, does the feature still justify its cost? If not, the plan is fragile.

---

## Domain-specific PRD additions

### Java / Spring

- **Thread safety analysis** (Goetz): Identify all shared mutable state. Document synchronization strategy for each.
- **Builder pattern for configuration** (Bloch): Any configuration class with 3+ fields should use a builder. No telescoping constructors.
- **Clean Code naming review** (Martin): Do class and method names reveal intent without requiring comments?
- **Executor configuration**: Thread pool size, rejection policy, timeout handling documented.

### .NET / C#

- **Async/await flow analysis** (Skeet): Map the async call chain. Any .Result or .Wait() is a potential deadlock. Document ConfigureAwait strategy.
- **GC impact for high-throughput** (Richter): Will this feature allocate large objects (85KB+) in hot paths? Plan for ArrayPool<T> or object pooling.
- **MediatR CQRS separation** (Microsoft): Commands and queries as separate objects. Controller is thin: it just maps HTTP to MediatR requests.
- **Nullable reference types**: NRT must be enabled. All nullable parameters explicitly marked.

### Database-heavy features

- **Index strategy with EXPLAIN requirements** (Schwartz): Every new query must include an EXPLAIN analysis. No query ships without checking the execution plan.
- **Read/write ratio for storage engine selection** (Kleppmann): Document the expected ratio. High writes -> consider LSM-based engines. High reads -> B-tree is fine.
- **Partitioning strategy** (Kleppmann + Petrov): If data exceeds single-node capacity, document partitioning key and strategy (hash vs range).
- **Replication and consistency requirements**: What isolation level? What replication topology? What is the acceptable replication lag?
