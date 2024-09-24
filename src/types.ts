import { OverpassNode, OverpassWay } from "overpass-ts";

export interface Network {
    nodes: OverpassNode[],
    ways: OverpassWay[]
}

