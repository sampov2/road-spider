import { overpass, OverpassJson } from "overpass-ts";
import { useEffect, useState } from "react";
import { Network } from "./types";
import Spider from "./Spider";

interface OSMProps {
    coords: number[],
    distance: number
}

function OSM({ coords, distance} : OSMProps) {
    const [ network, setNetwork ] = useState<Network|null>(null);
    useEffect(() => {
        if (distance === undefined || distance === null || coords === undefined || coords === null) {
            console.log('not yet set up to get data from overpass')
            return;
        }
        const query = 
        `[out:json]; (way["highway"](around:${distance},${coords[0]},${coords[1]}); ); out body; >; out skel qt;`

        overpass(query).then(async (res) => {
            const json = await res.json() as OverpassJson;

            const tmp : Network = {
                nodes: json.elements.filter(e => e.type === 'node'),
                ways: json.elements.filter(e => e.type === 'way')
            }
            setNetwork(tmp);
        })

    }, [coords, distance])

    return (
        <>
            {network !== null ? <Spider network={network}/> : <div>Loading...</div>}
        </>
    )
}

export default OSM;