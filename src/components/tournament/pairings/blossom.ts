// Maximum-weight matching in a general graph (Edmonds' blossom algorithm).
//
// TypeScript port of Joris van Rantwijk's classic mwmatching.py Python
// implementation (O(n^3)). The algorithm is taken from "Efficient Algorithms
// for Finding Maximum Matching in Graphs" by Zvi Galil, ACM Computing Surveys,
// 1986. It is based on the "blossom" method for finding augmenting paths and
// the "primal-dual" method for finding a matching of maximum weight, both due
// to Jack Edmonds.
//
// Vertices are numbered 0 .. numVertices-1. Non-trivial blossoms are numbered
// numVertices .. 2*numVertices-1. Edge endpoints ("half-edges") are numbered
// 0 .. 2*nedge-1, such that endpoints 2*k and 2*k+1 both belong to edge k.
//
// Weights are floating-point numbers; the implementation keeps vertex dual
// variables and slacks "pre-multiplied by two" exactly like the reference.
// For exact results use even integer weights.

const SENTINEL = -1

export interface BlossomEdge {
  u: number
  v: number
  w: number
}

/**
 * Computes a maximum-weighted matching in the general undirected weighted
 * graph given by `edges`. When `maxCardinality` is true, only
 * maximum-cardinality matchings are considered as solutions.
 *
 * Returns an array `mate` such that `mate[v]` is the vertex matched to `v`,
 * or -1 when `v` is single.
 */
export function maxWeightMatching(
  numVertices: number,
  edges: BlossomEdge[],
  maxCardinality = false,
): number[] {
  const mate = new Array<number>(numVertices).fill(SENTINEL)
  if (numVertices === 0 || edges.length === 0) return mate

  const nvertex = numVertices
  const nedge = edges.length

  // If p is an edge endpoint, endpoint[p] is the vertex to which endpoint p
  // is attached. Not modified by the algorithm.
  const endpoint = new Array<number>(2 * nedge)
  for (let k = 0; k < nedge; k++) {
    endpoint[2 * k] = edges[k].u
    endpoint[2 * k + 1] = edges[k].v
  }

  // If v is a vertex, neighbend[v] is the list of half-edges whose remote
  // endpoint is a neighbour of v.
  const neighbend: number[][] = Array.from({ length: nvertex }, () => [])
  for (let k = 0; k < nedge; k++) {
    neighbend[edges[k].u].push(2 * k + 1)
    neighbend[edges[k].v].push(2 * k)
  }

  // Maximum edge weight; vertex dual variables start there (or at 0 when
  // all weights are negative).
  let maxweight = 0
  for (const e of edges) {
    if (e.w > maxweight) maxweight = e.w
  }

  // If v is a vertex, dualvar[v] = 2*u(v) (pre-multiplied by two).
  // If b is a non-trivial blossom, dualvar[b] = z(b).
  const dualvar = new Array<number>(2 * nvertex).fill(0)
  for (let v = 0; v < nvertex; v++) dualvar[v] = maxweight

  // If b is a top-level blossom, label[b] is 0 (free), 1 (S-vertex/blossom)
  // or 2 (T-vertex/blossom). If v is a vertex inside a T-blossom, label[v]
  // is 2 iff v is reachable from an S-vertex outside the blossom.
  const label = new Array<number>(2 * nvertex).fill(0)
  const labelend = new Array<number>(2 * nvertex).fill(SENTINEL)
  const bestedge = new Array<number>(2 * nvertex).fill(SENTINEL)
  const inblossom = Array.from({ length: nvertex }, (_, i) => i)
  const blossomparent = new Array<number>(2 * nvertex).fill(SENTINEL)
  const blossomchilds: number[][] = Array.from({ length: 2 * nvertex }, () => [])
  const blossomendps: number[][] = Array.from({ length: 2 * nvertex }, () => [])
  const blossombase = Array.from({ length: 2 * nvertex }, (_, i) => (i < nvertex ? i : SENTINEL))
  const blossombestedges: number[][] = Array.from({ length: 2 * nvertex }, () => [])
  const unusedblossoms: number[] = []
  for (let b = nvertex; b < 2 * nvertex; b++) unusedblossoms.push(b)
  const allowedge = new Array<boolean>(nedge).fill(false)
  const queue: number[] = []

  /** Index into an array using both positive and negative (Python-style) indices. */
  function posNegIndex(arr: number[], index: number): number {
    return index >= 0 ? arr[index] : arr[arr.length + index]
  }

  /** Shifts the tail of the array to the front (Python slice rotation). */
  function rotateArr(arr: number[], split: number): void {
    const head = arr.slice(0, split)
    const tail = arr.slice(split)
    arr.length = 0
    arr.push(...tail, ...head)
  }

  /** Return 2 * slack of edge k (does not work inside blossoms). */
  function slack(k: number): number {
    return dualvar[edges[k].u] + dualvar[edges[k].v] - 2 * edges[k].w
  }

  /** Generate the leaf vertices of a blossom. */
  function blossomLeaves(b: number): number[] {
    const leaves: number[] = []
    if (b < nvertex) {
      leaves.push(b)
    } else {
      for (const t of blossomchilds[b]) {
        if (t < nvertex) {
          leaves.push(t)
        } else {
          leaves.push(...blossomLeaves(t))
        }
      }
    }
    return leaves
  }

  /**
   * Assign label t to the top-level blossom containing vertex w and record
   * the fact that w was reached through the edge with remote endpoint p.
   */
  function assignLabel(w: number, t: number, p: number): void {
    const b = inblossom[w]
    if (label[w] !== 0 || label[b] !== 0) throw new Error('blossom: label invariant')
    label[w] = t
    label[b] = t
    labelend[w] = p
    labelend[b] = p
    bestedge[w] = SENTINEL
    bestedge[b] = SENTINEL
    if (t === 1) {
      // b became an S-vertex/blossom; add its vertices to the queue.
      queue.push(...blossomLeaves(b))
    } else if (t === 2) {
      // b became a T-vertex/blossom; assign label S to its mate.
      // (If b is a non-trivial blossom, its base is the only vertex with an
      // external mate.)
      const base = blossombase[b]
      if (mate[base] === SENTINEL) throw new Error('blossom: mate invariant')
      const mbase = mate[base]
      assignLabel(endpoint[mbase], 1, mbase ^ 1)
    }
  }

  /**
   * Trace back from vertices v and w to discover either a new blossom or an
   * augmenting path. Return the base vertex of the new blossom or SENTINEL.
   */
  function scanBlossom(vArg: number, wArg: number): number {
    // Trace back from v and w, placing breadcrumbs as we go.
    const path: number[] = []
    let base = SENTINEL
    let v = vArg
    let w = wArg
    while (v !== SENTINEL || w !== SENTINEL) {
      // Look for a breadcrumb in v's blossom or put a new breadcrumb.
      let b = inblossom[v]
      if ((label[b] & 4) !== 0) {
        base = blossombase[b]
        break
      }
      if (label[b] !== 1) throw new Error('blossom: scanBlossom invariant')
      path.push(b)
      label[b] = 5
      // Trace one step back.
      if (labelend[b] === SENTINEL) {
        // The base of blossom b is single; stop tracing this path.
        v = SENTINEL
      } else {
        v = endpoint[labelend[b]]
        b = inblossom[v]
        // b is a T-blossom; trace one more step back.
        v = endpoint[labelend[b]]
      }
      // Swap v and w so that we alternate between both paths.
      if (w !== SENTINEL) {
        const tmp = v
        v = w
        w = tmp
      }
    }
    // Remove breadcrumbs.
    for (const b of path) label[b] = 1
    return base
  }

  /**
   * Construct a new blossom with given base, containing edge k which connects
   * a pair of S vertices. Label the new blossom as S; set its dual variable
   * to zero; relabel its T-vertices to S and add them to the queue.
   */
  function addBlossom(base: number, k: number): void {
    let v = edges[k].u
    let w = edges[k].v
    const bb = inblossom[base]
    let bv = inblossom[v]
    let bw = inblossom[w]

    // Create blossom.
    const b = unusedblossoms.pop() as number
    blossombase[b] = base
    blossomparent[b] = SENTINEL
    blossomparent[bb] = b

    // Make list of sub-blossoms and their interconnecting edge endpoints.
    blossomchilds[b] = []
    blossomendps[b] = []

    // Trace back from v to base.
    while (bv !== bb) {
      blossomparent[bv] = b
      blossomchilds[b].push(bv)
      blossomendps[b].push(labelend[bv])
      // Trace one step back.
      v = endpoint[labelend[bv]]
      bv = inblossom[v]
    }

    // Reverse lists, add endpoint that connects the pair of S vertices.
    blossomchilds[b].push(bb)
    blossomchilds[b].reverse()
    blossomendps[b].reverse()
    blossomendps[b].push(2 * k)

    // Trace back from w to base.
    while (bw !== bb) {
      blossomparent[bw] = b
      blossomchilds[b].push(bw)
      blossomendps[b].push(labelend[bw] ^ 1)
      // Trace one step back.
      w = endpoint[labelend[bw]]
      bw = inblossom[w]
    }

    // Set label to S.
    label[b] = 1
    labelend[b] = labelend[bb]

    // Set dual variable to zero.
    dualvar[b] = 0

    // Relabel vertices.
    for (const lv of blossomLeaves(b)) {
      if (label[inblossom[lv]] === 2) {
        // This T-vertex now turns into an S-vertex because it becomes part
        // of an S-blossom; add it to the queue.
        queue.push(lv)
      }
      inblossom[lv] = b
    }

    // Compute blossombestedges[b].
    const bestedgeto = new Array<number>(2 * nvertex).fill(SENTINEL)
    for (const sub of blossomchilds[b]) {
      const nblists: number[][] = []
      if (blossombestedges[sub].length === 0) {
        // This subblossom does not have a list of least-slack edges; get
        // the information from the vertices.
        for (const lv of blossomLeaves(sub)) {
          nblists.push(neighbend[lv].map((p) => p >> 1))
        }
      } else {
        // Walk this subblossom's least-slack edges.
        nblists.push(blossombestedges[sub])
      }
      for (const nblist of nblists) {
        for (const e of nblist) {
          let i = edges[e].u
          let j = edges[e].v
          if (inblossom[j] === b) {
            const tmp = i
            i = j
            j = tmp
          }
          const bj = inblossom[j]
          const bestto = bestedgeto[bj]
          if (bj !== b && label[bj] === 1 && (bestto === SENTINEL || slack(e) < slack(bestto))) {
            bestedgeto[bj] = e
          }
        }
      }
      // Forget about least-slack edges of the subblossom.
      blossombestedges[sub] = []
      bestedge[sub] = SENTINEL
    }
    blossombestedges[b] = bestedgeto.filter((e) => e !== SENTINEL)

    // Select bestedge[b].
    bestedge[b] = SENTINEL
    for (const e of blossombestedges[b]) {
      const be = bestedge[b]
      if (be === SENTINEL || slack(e) < slack(be)) bestedge[b] = e
    }
  }

  /**
   * Expand the given top-level blossom.
   */
  function expandBlossom(b: number, endstage: boolean): void {
    // Convert sub-blossoms into top-level blossoms.
    for (const s of [...blossomchilds[b]]) {
      blossomparent[s] = SENTINEL
      if (s < nvertex) {
        inblossom[s] = s
      } else if (endstage && dualvar[s] === 0) {
        // Recursively expand this sub-blossom.
        expandBlossom(s, endstage)
      } else {
        for (const v of blossomLeaves(s)) {
          inblossom[v] = s
        }
      }
    }

    // If we expand a T-blossom during a stage, its sub-blossoms must be
    // relabeled.
    if (!endstage && label[b] === 2) {
      // Start at the sub-blossom through which the expanding blossom
      // obtained its label, and relabel sub-blossoms until we reach the base.
      // Figure out through which sub-blossom the expanding blossom obtained
      // its label initially.
      if (labelend[b] === SENTINEL) throw new Error('blossom: expand invariant')
      const entrychild = inblossom[endpoint[labelend[b] ^ 1]]

      // Decide in which direction we will go round the blossom.
      let j = blossomchilds[b].indexOf(entrychild)
      let jstep: number
      let endptrick: number
      if ((j & 1) !== 0) {
        // Start index is odd; go forward and wrap.
        j -= blossomchilds[b].length
        jstep = 1
        endptrick = 0
      } else {
        // Start index is even; go backward.
        jstep = -1
        endptrick = 1
      }

      // Move along the blossom until we get to the base.
      let p = labelend[b]
      while (j !== 0) {
        // Relabel the T-sub-blossom.
        label[endpoint[p ^ 1]] = 0
        label[endpoint[posNegIndex(blossomendps[b], j - endptrick) ^ endptrick ^ 1]] = 0
        const ep = endpoint[p ^ 1]
        assignLabel(ep, 2, p)

        // Step to the next S-sub-blossom and note its forward endpoint.
        allowedge[posNegIndex(blossomendps[b], j - endptrick) >> 1] = true
        j += jstep
        p = posNegIndex(blossomendps[b], j - endptrick) ^ endptrick

        // Step to the next T-sub-blossom.
        allowedge[p >> 1] = true
        j += jstep
      }

      // Relabel the base T-sub-blossom WITHOUT stepping through to its mate
      // (so don't call assignLabel).
      const bv = posNegIndex(blossomchilds[b], j)
      label[endpoint[p ^ 1]] = 2
      label[bv] = 2
      labelend[endpoint[p ^ 1]] = p
      labelend[bv] = p
      bestedge[bv] = SENTINEL

      // Continue along the blossom until we get back to entrychild.
      j += jstep
      while (posNegIndex(blossomchilds[b], j) !== entrychild) {
        // Examine the vertices of the sub-blossom to see whether it is
        // reachable from a neighbouring S-vertex outside the expanding
        // blossom.
        const bv2 = posNegIndex(blossomchilds[b], j)
        if (label[bv2] === 1) {
          // This sub-blossom just got label S through one of its neighbours;
          // leave it.
          j += jstep
          continue
        }
        let v = SENTINEL
        for (const temp of blossomLeaves(bv2)) {
          v = temp
          if (label[v] !== 0) break
        }
        // If the sub-blossom contains a reachable vertex, assign label T to
        // the sub-blossom.
        if (label[v] !== 0) {
          label[v] = 0
          label[endpoint[mate[blossombase[bv2]]]] = 0
          const lblend = labelend[v]
          assignLabel(v, 2, lblend)
        }
        j += jstep
      }
    }

    // Recycle the blossom number.
    label[b] = SENTINEL
    labelend[b] = SENTINEL
    blossombase[b] = SENTINEL
    bestedge[b] = SENTINEL
    blossomchilds[b] = []
    blossomendps[b] = []
    blossombestedges[b] = []
    unusedblossoms.push(b)
  }

  /**
   * Swap matched/unmatched edges over an alternating path through blossom b
   * between vertex v and the base vertex. Keep blossom bookkeeping
   * consistent.
   */
  function augmentBlossom(b: number, v: number): void {
    // Bubble up through the blossom tree from vertex v to an immediate
    // sub-blossom of b.
    let t = v
    while (blossomparent[t] !== b) {
      t = blossomparent[t]
    }

    // Recursively deal with the first sub-blossom.
    if (t >= nvertex) {
      augmentBlossom(t, v)
    }

    // Decide in which direction we will go round the blossom.
    const i = blossomchilds[b].indexOf(t)
    let j = i
    let jstep: number
    let endptrick: number
    if ((i & 1) !== 0) {
      // Start index is odd; go forward and wrap.
      j -= blossomchilds[b].length
      jstep = 1
      endptrick = 0
    } else {
      // Start index is even; go backward.
      jstep = -1
      endptrick = 1
    }

    // Move along the blossom until we get to the base.
    while (j !== 0) {
      // Step to the next sub-blossom and augment it recursively.
      j += jstep
      let t2 = posNegIndex(blossomchilds[b], j)
      const p = posNegIndex(blossomendps[b], j - endptrick) ^ endptrick
      if (t2 >= nvertex) {
        augmentBlossom(t2, endpoint[p])
      }

      // Step to the next sub-blossom and augment it recursively.
      j += jstep
      t2 = posNegIndex(blossomchilds[b], j)
      if (t2 >= nvertex) {
        augmentBlossom(t2, endpoint[p ^ 1])
      }

      // Match the edge connecting those sub-blossoms.
      mate[endpoint[p]] = p ^ 1
      mate[endpoint[p ^ 1]] = p
    }

    // Rotate the list of sub-blossoms to put the new base at the front.
    rotateArr(blossomchilds[b], i)
    rotateArr(blossomendps[b], i)
    blossombase[b] = blossombase[blossomchilds[b][0]]
  }

  /**
   * Swap matched/unmatched edges over an alternating path between two single
   * vertices. The augmenting path runs through edge k, which connects a pair
   * of S vertices.
   */
  function augmentMatching(k: number): void {
    const v0 = edges[k].u
    const w0 = edges[k].v
    for (const [s0, p0] of [
      [v0, 2 * k + 1],
      [w0, 2 * k],
    ] as const) {
      let s = s0
      let p = p0
      // Match vertex s to remote endpoint p. Then trace back from s until we
      // find a single vertex, swapping matched and unmatched edges as we go.
      for (;;) {
        const bs = inblossom[s]
        if (bs >= nvertex) {
          // Augment through the S-blossom from s to base.
          augmentBlossom(bs, s)
        }

        // Update mate[s].
        mate[s] = p

        // Trace one step back.
        if (labelend[bs] === SENTINEL) {
          // Reached single vertex; stop.
          break
        }
        const t = endpoint[labelend[bs]]
        const bt = inblossom[t]

        // Trace one step back.
        s = endpoint[labelend[bt]]
        const j = endpoint[labelend[bt] ^ 1]

        // Augment through the T-blossom from j to base.
        if (bt >= nvertex) {
          augmentBlossom(bt, j)
        }

        // Update mate[j].
        mate[j] = labelend[bt]

        // Keep the opposite endpoint; it will be assigned to mate[s] in the
        // next step.
        p = labelend[bt] ^ 1
      }
    }
  }

  // Main loop: continue until no further improvement is possible.
  stageLoop: for (let stage = 0; stage < nvertex; stage++) {
    // Each iteration of this loop is a "stage". A stage finds an augmenting
    // path and uses that to improve the matching.

    // Remove labels from top-level blossoms/vertices.
    label.fill(0)

    // Forget all about least-slack edges.
    bestedge.fill(SENTINEL)
    for (let b = nvertex; b < 2 * nvertex; b++) {
      blossombestedges[b] = []
    }

    // Loss of labeling means that we can not be sure that currently
    // allowable edges remain allowable throughout this stage.
    allowedge.fill(false)

    // Make queue empty.
    queue.length = 0

    // Label single blossoms/vertices with S and put them in the queue.
    for (let v = 0; v < nvertex; v++) {
      if (mate[v] === SENTINEL && label[inblossom[v]] === 0) {
        assignLabel(v, 1, SENTINEL)
      }
    }

    // Loop until we succeed in augmenting the matching.
    let augmented = false
    substageLoop: for (;;) {
      // Each iteration of this loop is a "substage". A substage tries to
      // find an augmenting path; if found, the path is used to improve the
      // matching and the stage ends. If there is no augmenting path, the
      // primal-dual method is used to pump some slack out of the dual
      // variables.

      // Continue labeling until all vertices which are reachable through an
      // alternating path have got a label.
      while (queue.length !== 0 && !augmented) {
        // Take an S vertex from the queue.
        const v = queue.pop() as number

        // Scan its neighbours.
        for (const p of neighbend[v]) {
          const k = p >> 1
          const w = endpoint[p]
          // w is a neighbour of v
          if (inblossom[v] === inblossom[w]) {
            // this edge is internal to a blossom; ignore it
            continue
          }
          let kslack = 0
          if (!allowedge[k]) {
            kslack = slack(k)
            if (kslack <= 0) {
              // edge k has zero slack => it is allowable
              allowedge[k] = true
            }
          }
          if (allowedge[k]) {
            if (label[inblossom[w]] === 0) {
              // (C1) w is a free vertex; label w with T and label its mate
              // with S (R12).
              assignLabel(w, 2, p ^ 1)
            } else if (label[inblossom[w]] === 1) {
              // (C2) w is an S-vertex (not in the same blossom); follow
              // back-links to discover either an augmenting path or a new
              // blossom.
              const base = scanBlossom(v, w)
              if (base !== SENTINEL) {
                // Found a new blossom; add it to the blossom bookkeeping
                // and turn it into an S-blossom.
                addBlossom(base, k)
              } else {
                // Found an augmenting path; augment the matching and end
                // this stage.
                augmentMatching(k)
                augmented = true
                break
              }
            } else if (label[w] === 0) {
              // w is inside a T-blossom, but w itself has not yet been
              // reached from outside the blossom; mark it as reached (we
              // need this to relabel during T-blossom expansion).
              label[w] = 2
              labelend[w] = p ^ 1
            }
          } else if (label[inblossom[w]] === 1) {
            // keep track of the least-slack non-allowable edge to a
            // different S-blossom.
            const b = inblossom[v]
            if (bestedge[b] === SENTINEL || kslack < slack(bestedge[b])) {
              bestedge[b] = k
            }
          } else if (label[w] === 0) {
            // w is a free vertex (or an unreached vertex inside a T-blossom)
            // but we can not reach it yet; keep track of the least-slack
            // edge that reaches w.
            if (bestedge[w] === SENTINEL || kslack < slack(bestedge[w])) {
              bestedge[w] = k
            }
          }
        }
      }

      if (augmented) {
        break
      }

      // There is no augmenting path under these constraints; compute delta
      // and reduce slack in the optimization problem. (Note that our vertex
      // dual variables, edge slacks and delta's are pre-multiplied by two.)
      let deltatype = -1
      let delta = 0
      let deltaedge = 0
      let deltablossom = 0

      if (!maxCardinality) {
        // Compute delta1: the minimum of any vertex dual.
        deltatype = 1
        delta = dualvar[0]
        for (let v = 1; v < nvertex; v++) {
          if (dualvar[v] < delta) delta = dualvar[v]
        }
      }

      // Compute delta2: the minimum slack on any edge between an S-vertex
      // and a free vertex.
      for (let v = 0; v < nvertex; v++) {
        if (label[inblossom[v]] === 0 && bestedge[v] !== SENTINEL) {
          const d = slack(bestedge[v])
          if (deltatype === -1 || d < delta) {
            delta = d
            deltatype = 2
            deltaedge = bestedge[v]
          }
        }
      }

      // Compute delta3: half the minimum slack on any edge between a pair
      // of S-blossoms.
      for (let b = 0; b < 2 * nvertex; b++) {
        if (blossomparent[b] === SENTINEL && label[b] === 1 && bestedge[b] !== SENTINEL) {
          const kslack = slack(bestedge[b])
          const d = Math.floor(kslack / 2)
          if (deltatype === -1 || d < delta) {
            delta = d
            deltatype = 3
            deltaedge = bestedge[b]
          }
        }
      }

      // Compute delta4: minimum z variable of any T-blossom.
      for (let b = nvertex; b < 2 * nvertex; b++) {
        if (
          blossombase[b] !== SENTINEL &&
          blossomparent[b] === SENTINEL &&
          label[b] === 2 &&
          (deltatype === -1 || dualvar[b] < delta)
        ) {
          delta = dualvar[b]
          deltatype = 4
          deltablossom = b
        }
      }

      if (deltatype === -1) {
        // No further improvement possible; max-cardinality optimum reached.
        // Do a final delta update to make the optimum verifyable.
        deltatype = 1
        delta = dualvar[0]
        for (let v = 1; v < nvertex; v++) {
          if (dualvar[v] < delta) delta = dualvar[v]
        }
        if (delta < 0) delta = 0
      }

      // Update dual variables according to delta.
      for (let v = 0; v < nvertex; v++) {
        switch (label[inblossom[v]]) {
          case 0:
            break
          case 1:
            // S-vertex: 2*u = 2*u - 2*delta
            dualvar[v] -= delta
            break
          case 2:
            // T-vertex: 2*u = 2*u + 2*delta
            dualvar[v] += delta
            break
          default:
            throw new Error('blossom: unexpected label[inblossom]')
        }
      }
      for (let b = nvertex; b < 2 * nvertex; b++) {
        if (blossombase[b] !== SENTINEL && blossomparent[b] === SENTINEL) {
          switch (label[b]) {
            case 0:
              break
            case 1:
              // top-level S-blossom: z = z + 2*delta
              dualvar[b] += delta
              break
            case 2:
              // top-level T-blossom: z = z - 2*delta
              dualvar[b] -= delta
              break
            default:
              throw new Error('blossom: unexpected label')
          }
        }
      }

      // Take action at the point where minimum delta occurred.
      if (deltatype === 1) {
        // No further improvement possible; optimum reached.
        break substageLoop
      } else if (deltatype === 2) {
        // Use the least-slack edge to continue the search.
        allowedge[deltaedge] = true
        let i = edges[deltaedge].u
        const j = edges[deltaedge].v
        if (label[inblossom[i]] === 0) {
          i = j
        }
        queue.push(i)
      } else if (deltatype === 3) {
        // Use the least-slack edge to continue the search.
        allowedge[deltaedge] = true
        queue.push(edges[deltaedge].u)
      } else if (deltatype === 4) {
        // Expand the least-z blossom.
        expandBlossom(deltablossom, false)
      } else {
        throw new Error('blossom: unexpected deltatype')
      }
      // End of this substage.
      }

      // Stop when no more augmenting path can be found.
      if (!augmented) {
        break
      }

      // End of a stage; expand all S-blossoms which have dualvar = 0.
      for (let b = nvertex; b < 2 * nvertex; b++) {
        if (
          blossomparent[b] === SENTINEL &&
          blossombase[b] !== SENTINEL &&
          label[b] === 1 &&
          dualvar[b] === 0
        ) {
          expandBlossom(b, true)
        }
      }
  }

  // Transform mate[] such that mate[v] is the vertex to which v is paired.
  for (let v = 0; v < nvertex; v++) {
    if (mate[v] !== SENTINEL) {
      mate[v] = endpoint[mate[v]]
    }
  }
  return mate
}






