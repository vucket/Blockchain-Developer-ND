pragma solidity >=0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address payable private contractOwner; // Account used to deploy contract
    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;
    FlightSuretyData private flightData;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;
    uint256 public constant MIN_FUNDING = 10 ether;
    uint256 public constant MAX_INSURANCE_VAL = 1 ether;

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
        string flightCode;
    }
    // Rubric does not specify how to register flights so I will just hardcode the flights
    mapping(string => Flight) private flights;

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        // Modify to call data contract's status
        require(
            flightData.isOperational(),
            "Contract is currently not operational"
        );
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireNewAirline(address airlineAddress) {
        require(flightData.isNewAirline(airlineAddress), "Airline is not new");
        _;
    }

    modifier requireIsCallerAirline() {
        require(
            flightData.isAirlineRegistered(msg.sender) &&
                flightData.isAirlineFunded(msg.sender),
            "Caller is not a registered Airline"
        );
        _;
    }

    modifier requireIsCallerRegistered() {
        require(
            flightData.isAirlineRegistered(msg.sender),
            "Caller is not registered"
        );
        _;
    }

    modifier requireIsCallerFunded() {
        require(flightData.isAirlineFunded(msg.sender), "Caller is not funded");
        _;
    }

    modifier requireNewFlight(string memory flightCode) {
        require(!flights[flightCode].isRegistered, "Flight already registered");
        _;
    }

    modifier requireFlightRegistered(string memory flightCode) {
        require(flights[flightCode].isRegistered, "Flight is not registered");
        _;
    }

    modifier requireAirlineHasFlight(
        address airline,
        string memory flightCode
    ) {
        require(
            flights[flightCode].airline == airline,
            "Flight is not registered"
        );
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor() public {
        contractOwner = msg.sender;
        // Register hardcoded flights

        uint256 defaultStamp = 1645987938346;
        flights["F1"] = Flight(
            true,
            STATUS_CODE_ON_TIME,
            defaultStamp,
            msg.sender,
            "F1"
        );
        flights["F2"] = Flight(
            true,
            STATUS_CODE_LATE_OTHER,
            defaultStamp,
            msg.sender,
            "F2"
        );
        flights["F3"] = Flight(
            true,
            STATUS_CODE_LATE_AIRLINE,
            defaultStamp,
            msg.sender,
            "F3"
        );
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public view returns (bool) {
        return flightData.isOperational(); // Modify to call data contract's status
    }

    function setOperatingStatus(bool mode) external requireContractOwner {
        flightData.setOperatingStatus(mode);
    }

    //************************************* */
    // EVENTS
    //************************************* */
    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    event AirlineRegistered(address airlineAddress);
    event AirlineFunded(address airlineAddress, uint256 amount);
    event InsuranceBought(address buyer, string flightCode, uint256 amount);
    event InsuranceClaimed(address buyer, string flightCode);
    event InsuranceRefunded(address buyer, string flightCode);

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerAirline(address airlineAddress)
        external
        requireIsOperational
        requireIsCallerAirline
        requireNewAirline(airlineAddress)
        returns (bool success, uint256 votes)
    {
        uint256 registeredAirlines = flightData.getRegisteredAirlines();
        success = false;
        votes = 0;
        if (registeredAirlines < 4) {
            flightData.registerAirline(airlineAddress);
            success = true;
            votes = 0;
        } else {
            uint256 currentVotes = flightData.voteForAirline(
                airlineAddress,
                msg.sender
            );
            if (currentVotes > registeredAirlines.div(2)) {
                flightData.registerAirline(airlineAddress);
                success = true;
                votes = currentVotes;
            } else {
                success = false;
                votes = currentVotes;
            }
        }
        if (success) {
            emit AirlineRegistered(airlineAddress);
        }
        return (success, votes);
    }

    function fundAirline()
        external
        payable
        requireIsOperational
        requireIsCallerRegistered
    {
        require(msg.value >= MIN_FUNDING, "You need at least 10 eth");
        contractOwner.transfer(msg.value);
        flightData.fund(msg.sender, msg.value);
        emit AirlineFunded(msg.sender, msg.value);
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight(
        string memory flightCode,
        uint8 statusCode,
        uint256 timeStamp
    )
        public
        requireIsOperational
        requireIsCallerAirline
        requireNewFlight(flightCode)
    {
        flights[flightCode] = Flight(
            true,
            statusCode,
            timeStamp,
            msg.sender,
            flightCode
        );
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus(
        address airline,
        string memory flightCode,
        uint256 timestamp,
        uint8 statusCode
    )
        internal
        requireIsOperational
        requireFlightRegistered(flightCode)
        requireAirlineHasFlight(airline, flightCode)
    {
        flights[flightCode].updatedTimestamp = timestamp;
        flights[flightCode].statusCode = statusCode;
    }

    function buyInsurance(address airline, string calldata flightCode)
        external
        payable
        requireIsOperational
        requireFlightRegistered(flightCode)
        requireAirlineHasFlight(airline, flightCode)
    {
        require(
            msg.value <= MAX_INSURANCE_VAL,
            "You can buy max 1 eth value for insurance"
        );
        contractOwner.transfer(msg.value);
        flightData.buy(msg.sender, airline, flightCode, msg.value);
        emit InsuranceBought(msg.sender, flightCode, msg.value);
    }

    function claimInsurance(address airline, string calldata flightCode)
        external
        payable
        requireIsOperational
        requireFlightRegistered(flightCode)
        requireAirlineHasFlight(airline, flightCode)
    {
        require(
            flights[flightCode].statusCode == STATUS_CODE_LATE_AIRLINE,
            "Flight is not late because of Airline"
        );
        flightData.creditInsurees(msg.sender, airline, flightCode);
        emit InsuranceClaimed(msg.sender, flightCode);
    }

    function refundInsurance(
        address payable buyer,
        address airline,
        string calldata flightCode
    )
        external
        payable
        requireIsOperational
        requireContractOwner
        requireFlightRegistered(flightCode)
        requireAirlineHasFlight(airline, flightCode)
    {
        require(
            flights[flightCode].statusCode == STATUS_CODE_LATE_AIRLINE,
            "Flight is not late because of Airline"
        );
        flightData.pay(buyer, airline, flightCode);
        emit InsuranceRefunded(buyer, flightCode);
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string calldata flightCode,
        uint256 timestamp
    )
        external
        requireIsOperational
        requireFlightRegistered(flightCode)
        requireAirlineHasFlight(airline, flightCode)
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flightCode, timestamp)
        );
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flightCode, timestamp);
    }

    // region ORACLE MANAGEMENT

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Register an oracle with the contract
    function registerOracle() external payable requireIsOperational {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes()
        external
        view
        requireIsOperational
        returns (uint8[3] memory)
    {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string calldata flight,
        uint256 timestamp,
        uint8 statusCode
    ) external requireIsOperational {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal view requireIsOperational returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account)
        internal
        returns (uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion
}
