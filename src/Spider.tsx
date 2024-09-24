import { Bodies, Body, Composite, Composites, Engine, Render, Runner, World } from "matter-js";
import { Network } from "./types";
import { createRef, useEffect } from "react";

interface SpiderProps {
    network: Network
}

interface BoundingBox {
    extent: number[]
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

    return { extent }
}

function Spider({ network }: SpiderProps) {
    const matterElement = createRef<HTMLDivElement>();

    useEffect(() => {
        if (matterElement.current === null || !network) {
            return;
        }

        // create an engine
        var engine = Engine.create({ detector: undefined });

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

        // Define a proportion of the sides to be static
        const staticSideRel = 1.2;
        const staticSideBox = {
            extent: [-staticSideRel, -staticSideRel, staticSideRel, staticSideRel],
        }

        const group = Body.nextGroup(true);

        // 1. Create function that creates a circle for each (requested) network nodes
        const nodes : NodeDict<Body> = {}
        const getNode = (nodeId: number) : Body => {
            if (nodes[nodeId] === undefined) {
                const node = network.nodes.find(n => n.id === nodeId);
                if (node === undefined) throw Error(`No node with id ${nodeId}`)
                
                const vertices = reproject([node.lon, node.lat], bbox, target)
                const isStatic = !!reproject([node.lon, node.lat], bbox, staticSideBox).find(n => Math.abs(n) >= 1.0)

                nodes[node.id] = Bodies.circle(vertices[0], vertices[1], 2, { 
                    isStatic,
                    collisionFilter: { group }
                })
            }
            return nodes[nodeId];
        }

        // 2. Create chains from network ways
        const chains = network.ways
            .filter((way) => way.nodes.length > 1)
            .map((way) => {
                const comp = Composite.create({
                    bodies: way.nodes.map(n => getNode(n))
                })
                return Composites.chain(comp, 0, 0, 0, 0, { group })
            })
            .flat()
            .filter((_v, i) => i < 20)

        // 3. add all of the bodies to the world
        Composite.add(engine.world, [...chains]);
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
