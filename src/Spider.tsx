import { Bodies, Body, Composite, Constraint, Engine, Render, Runner, Vertices, World } from "matter-js";
import { Network } from "./types";
import { createRef, useEffect } from "react";
import { OverpassNode } from "overpass-ts";

interface SpiderProps {
    network: Network
}

interface BoundingBox {
    extent: number[],
    //width: number,
    //height: number
}

interface NodeDict<T> {
    [n: string]: T
}


const reproject = (points: number[], pointBbox: BoundingBox, targetBbox: BoundingBox) : number[] => {
    return points.map((p, i) => {
        const axis = i % 2;
        return targetBbox.extent[axis] + (p - pointBbox.extent[axis])/(pointBbox.extent[axis+2] - pointBbox.extent[axis]) * (targetBbox.extent[axis+2] - targetBbox.extent[axis])
    })
}


export const boundingBox = (network: Network) : BoundingBox => {
    const extent : number[] = [];
    network.nodes.forEach((node) => {
        if (extent[0] === undefined || extent[0] > node.lon) {
            extent[0] = node.lon;
        }
        if (extent[1] === undefined || extent[1] > node.lat) {
            extent[1] = node.lat;
        }
        if (extent[2] === undefined || extent[2] < node.lon) {
            extent[2] = node.lon;
        }
        if (extent[3] === undefined || extent[3] < node.lat) {
            extent[3] = node.lat;
        }
    })

    return {
        extent,
        //width: extent[2] - extent[0],
        //height: extent[3] - extent[1]
    }
}

function Spider({ network }: SpiderProps) {
    const matterElement = createRef<HTMLDivElement>();

    useEffect(() => {
        if (matterElement.current === null) {
            return;
        }

        // create an engine
        var engine = Engine.create();

        // create a renderer
        var render = Render.create({
            element: matterElement.current,
            engine: engine
        });

        // domain bounding box
        const bbox = boundingBox(network)

        // target bounding box
        const target = {
            extent: [0, 600, 800, 0],
            width: 800,
            height: 600
        }


        const stickySides = 1.2;
        const stickySideBox = {
            extent: [-stickySides, -stickySides, stickySides, stickySides],
        }

        // 1. Create circles from network nodes
        const nodes = network.nodes
            .reduce((memo,node) => {
                const vertices = reproject([node.lon, node.lat], bbox, target)
                const isStatic = !!reproject([node.lon, node.lat], bbox, stickySideBox).find(n => Math.abs(n) >= 1.0)

                memo[node.id] = Bodies.circle(vertices[0], vertices[1], 2, { isStatic })
                return memo;
            }, {} as NodeDict<Body>)

        // 2. Create constraints from network ways
        const constraints = network.ways
            .map((way) => {
                const ret : Constraint[] = [];
                let objectA = nodes[way.nodes[0]]
                for (let i = 1; i < way.nodes.length; i++) {
                    let objectB = nodes[way.nodes[i]]

                    ret.push(Constraint.create({
                        bodyA: objectA,
                        bodyB: objectB,
                    }))

                    objectA = objectB;
                }
                return ret;
            }).flat()

        // 3. add all of the bodies to the world
        const objects = Object.keys(nodes).map((key : string) => nodes[key]);
        
        const floor = Bodies.rectangle(
            target.width*.5, target.height*.99, 
            target.width*.8, 10, { isStatic: true })

        Composite.add(engine.world, [...objects, ...constraints, floor]);
        Render.run(render);

        var runner = Runner.create();
        Runner.run(runner, engine);
        
        return () => {
            Render.stop(render);
            World.clear(engine.world, false);
            Engine.clear(engine);
            render.canvas.remove();
        }
    }, [matterElement, network])
    return (
        <div ref={matterElement} style={{ width: '800px', height: '600px' }}/>
    )
}

export default Spider;
