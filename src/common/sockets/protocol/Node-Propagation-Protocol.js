import NodesWaitlist from 'node/lists/waitlist/Nodes-Waitlist'
import NodesList from 'node/lists/Nodes-List'
import NODES_TYPE from "node/lists/types/Nodes-Type";
import NodeProtocol from 'common/sockets/protocol/extend-socket/Node-Protocol';


class NodePropagationProtocol {


    initializePropagationProtocol(){

        NodesList.emitter.once("nodes-list/connected", nodeListObject => { this._newNodeConnected( nodeListObject ) } );
        NodesList.emitter.once("nodes-list/disconnected", nodeListObject => { this._nodeDisconnected( nodeListObject) });

        NodesWaitlist.emitter.on("waitlist/new-node", nodeWaitListObject => { this._newNodeConnected( nodeWaitListObject) } );
        NodesWaitlist.emitter.on("waitlist/delete-node", nodeWaitListObject => { this._nodeDisconnected( nodeWaitListObject) });

    }

    initializeSocketForPropagation(socket){

        this.initializeNodesPropagation(socket);

        setTimeout( ()=>{
            socket.node.sendRequest("propagation/request-all-wait-list/full-nodes");
            socket.node.sendRequest("propagation/request-all-wait-list/light-nodes");
        },  1000);

    }

    initializeNodesPropagation(socket){

        socket.node.on("propagation/request-all-wait-list/full-nodes", response =>{

            try{

                let list = [];
                for (let i=0; i<NodesWaitlist.waitListFullNodes.length; i++) list.push(NodesWaitlist.waitListFullNodes[i].toJSON());

                socket.node.sendRequest("propagation/nodes", {"op": "new-full-nodes", addresses: list });

            } catch(exception){
            }

        });

        socket.node.on("propagation/request-all-wait-list/light-nodes", response =>{

            try{

                let list = [];
                for (let i=0; i<NodesWaitlist.waitListFullNodes.length; i++) list.push(NodesWaitlist.waitListLightNodes[i].toJSON());

                socket.node.sendRequest("propagation/nodes", {"op": "new-light-nodes", addresses: list });

            } catch(exception){
            }

        });

        socket.node.on("propagation/nodes", response => {

            try {

                let addresses = response.addresses || [];
                if (typeof addresses === "string") addresses = [addresses];

                if (!Array.isArray(addresses)) throw {message: "addresses is not an array"};

                let op = response.op || '';

                switch (op) {

                    case "new-full-nodes":
                    case "new-light-nodes":

                        for (let i = 0; i < addresses.length; i++)
                            NodesWaitlist.addNewNodeToWaitlist( addresses[i].addr, addresses[i].port, addresses[i].https, addresses[i].type, addresses[i].connected, socket.node.level + 1, socket);

                        break;

                    case "deleted-light-nodes":
                    case "deleted-full-nodes":

                        for (let i = 0; i < addresses.length; i++)
                            NodesWaitlist.addNewNodeToWaitlist( addresses[i].addr, addresses[i].port, addresses[i].https, addresses[i].type, addresses[i].connected, socket.node.level + 1, socket);

                        break;

                    default:
                        throw {message: "Op is invalid"};

                }

            }
            catch (exception){

            }

        });
    }

    _newNodeConnected( nodeWaitListObject ){

        if (nodeWaitListObject.type === NODES_TYPE.NODE_TERMINAL) NodeProtocol.broadcastRequest("propagation/nodes", {op: "new-full-nodes", addresses: [nodeWaitListObject.toJSON() ]}, undefined, nodeWaitListObject.socket);
        else if(nodeWaitListObject.type === NODES_TYPE.NODE_WEB_PEER) NodeProtocol.broadcastRequest("propagation/nodes", {op: "new-light-nodes", addresses: [nodeWaitListObject.toJSON() ]}, undefined, nodeWaitListObject.socket);

    }

    _nodeDisconnected(nodeWaitListObject){

        if (nodeWaitListObject.type === NODES_TYPE.NODE_TERMINAL) NodeProtocol.broadcastRequest("propagation/nodes", {op: "disconnected-full-nodes", addresses: [nodeWaitListObject.toJSON() ]}, undefined, nodeWaitListObject.socket);
        else if(nodeWaitListObject.type === NODES_TYPE.NODE_WEB_PEER) NodeProtocol.broadcastRequest("propagation/nodes", {op: "disconnected-light-nodes", addresses: [nodeWaitListObject.toJSON() ]} , undefined, nodeWaitListObject.socket );

    }

}

export default new NodePropagationProtocol();
