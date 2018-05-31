import consts from 'consts/const_global';
import Convert from 'common/utils/Convert';
import NodesList from 'node/lists/Nodes-List';
import PoolData from 'common/mining-pools/pool-management/pool-data/Pool-Data';
import BlockchainMiningReward from 'common/blockchain/global/Blockchain-Mining-Reward';
import  Utils from "common/utils/helpers/Utils"
import PoolManagement from "../pool-management/Pool-Settings";

class PoolLeaderProtocol {

    constructor(poolManagement, databaseName = consts.DATABASE_NAMES.POOL_DATABASE) {

        this.poolManagement = poolManagement;

        NodesList.emitter.on("nodes-list/connected", (result) => {
            this._subscribeMiner(result)
        });

        NodesList.emitter.on("nodes-list/disconnected", (result) => {
            this._unsubscribeMiner(result)
        });


    }

    _subscribeMiner(nodesListObject) {

        let socket = nodesListObject.socket;


        socket.node.on("mining-pool/hello-pool", (data) => {

            try{

                if (Buffer.isBuffer( data.message )  || data.message.length !== 32) throw {message: "message is invalid"};
                if (Buffer.isBuffer( data.minerPublicKey )  || data.minerPublicKey.length !== consts.ADDRESSES.PUBLIC_KEY.LENGTH) throw {message: "minerPublicKey is invalid"};
                if (Buffer.isBuffer( data.minerAddress )  || data.minerAddress.length !== consts.ADDRESSES.ADDRESS.LENGTH) throw {message: "minerAddress is invalid"};

                // save minerPublicKey
                let miner = this.poolManagement.poolData.getMiner(data.minerAddress);

                if (miner === null )
                    miner = this.poolManagement.poolData.addMiner(data.minerAddress);

                miner.addPublicKey(data.minerPublicKey);

                let signature = this.poolManagement.poolSettings.poolDigitalSign(data.message);
                socket.node.sendRequest("mining-pool/hello-pool"+"/answer", { signature: signature, status: "great" } );

            } catch (exception){

            }

        });

        //TODO change-wallet
        socket.node.on("mining-pool/change-wallet", (data) => {

            try{

                if (Buffer.isBuffer( data.address )  || data.address.length !== consts.ADDRESSES.ADDRESS.LENGTH) throw {message: "address is invalid"};
                if (Buffer.isBuffer( data.publicKey)  || data.publicKey.length !== consts.ADDRESSES.PUBLIC_KEY.LENGTH) throw {message: "publicKey is invalid"};

                let miner = this.poolManagement.poolData.getMiner(data.address);
                if (miner === null) throw {message: "mine was not found"};



            } catch (exception){
                socket.node.sendRequest("mining-pool/change-wallet"+"/answer", {result: false, message: exception.message } )
            }

        });

        //TODO request reward
        socket.node.on("mining-pool/request-reward", async (data) => {

            try {

                if (Buffer.isBuffer( data.minerAddress )  || data.minerAddress.length !== consts.ADDRESSES.ADDRESS.LENGTH) throw {message: "minerAddress is invalid"};

                // load minerPublicKey
                let miner = this.poolManagement.poolData.getMiner(data.minerAddress);
                if (miner === null) throw {message: "mine was not found"};

                let answer = await this.poolManagement.sendReward(data.minerAddress);

                socket.node.sendRequest("mining-pool/request-reward"+"/answer", {result: answer } )

            } catch (exception) {
                socket.node.sendRequest("mining-pool/request-reward"+"/answer", {result: false, message: exception.message } )
            }
        });

        socket.node.on("mining-pool/work-done", (data) => {

            try{

                if (Buffer.isBuffer( data.minerPublicKey )  || data.minerPublicKey.length !== consts.ADDRESSES.PUBLIC_KEY.LENGTH) throw {message: "minerPublicKey is invalid"};

                let minerInstance = this.poolManagement.poolData.getMinerInstanceByPublicKey(data.minerPublicKey);
                if (minerInstance === null) throw {message: "publicKey was not found"};

                let answer = this.poolManagement.receivePoolWork(minerInstance, data.work);

                let newWork = this.poolManagement.getWork(minerInstance);

                socket.node.sendRequest("mining-pool/work-done"+"/answer", {result: true, answer: answer.result, reward: answer.reward, newWork: newWork } ); //the new reward

            } catch (exception){
                socket.node.sendRequest("mining-pool/get-miner-work"+"/answer", {result: false, message: exception.message } )
            }

        });

        socket.node.on("mining-pool/get-miner-work", (data) => {

            try {

                if (Buffer.isBuffer( data.minerPublicKey )  || data.minerPublicKey.length !== consts.ADDRESSES.PUBLIC_KEY.LENGTH) throw {message: "minerPublicKey is invalid"};

                let minerInstance = this.poolManagement.poolData.getMinerInstanceByPublicKey(data.minerPublicKey);
                if (minerInstance === null) throw {message: "publicKey was not found"};

                let work = this.poolManagement.generatePoolWork(minerInstance);

                socket.node.sendRequest("mining-pool/get-miner-work"+"/answer", {result: true, work: work } )

            } catch (exception){

                socket.node.sendRequest("mining-pool/get-miner-work"+"/answer", {result: false, message: exception.message } );

            }

        });

    }

    _unsubscribeMiner(nodesListObject) {

        let socket = nodesListObject.socket;

    }



}

export default PoolLeaderProtocol;