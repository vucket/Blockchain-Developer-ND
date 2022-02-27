pragma solidity >=0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor(address payable contractAddress) public {
        contractOwner = contractAddress;
        airlines[contractAddress] = Airline(true, false, 0, new address[](0));
    }

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
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsAirlineRegistered(address airlineAddress) {
        require(
            isAirlineRegistered(airlineAddress),
            "Airline is not registered"
        );
        _;
    }

    modifier requireIsAirlineFunded(address airlineAddress) {
        require(isAirlineFunded(airlineAddress), "Airline is not funded");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    function isNewAirline(address airlineAddress)
        external
        view
        requireIsOperational
        returns (bool)
    {
        return
            !airlines[airlineAddress].isRegistered &&
            !airlines[airlineAddress].isFunded;
    }

    function isAirlineRegistered(address airlineAddress)
        public
        view
        requireIsOperational
        returns (bool)
    {
        return airlines[airlineAddress].isRegistered;
    }

    function isAirlineFunded(address airlineAddress)
        public
        view
        requireIsOperational
        returns (bool)
    {
        return airlines[airlineAddress].isFunded;
    }

    function getRegisteredAirlines()
        public
        view
        requireIsOperational
        returns (uint256)
    {
        operatingAirlinesCount;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    mapping(address => Airline) private airlines;

    uint256 private operatingAirlinesCount = 0;

    struct Airline {
        bool isRegistered;
        bool isFunded;
        uint256 funds;
        address[] approvalVotes;
    }

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(address airlineAddress)
        external
        requireIsOperational
        requireIsAirlineRegistered(msg.sender)
        requireIsAirlineFunded(msg.sender)
    {
        airlines[airlineAddress] = Airline(
            true,
            false,
            0,
            airlines[airlineAddress].approvalVotes
        );
        operatingAirlinesCount++;
    }

    function voteForAirline(address airlineAddress, address voter)
        external
        requireIsOperational
        returns (uint256 length)
    {
        bool isDuplicate = false;
        for (
            uint256 i = 0;
            i < airlines[airlineAddress].approvalVotes.length;
            i++
        ) {
            if (airlines[airlineAddress].approvalVotes[i] == msg.sender) {
                isDuplicate = true;
                break;
            }
        }
        require(!isDuplicate, "Duplicate vote");

        airlines[airlineAddress].approvalVotes.push(voter);
        return airlines[airlineAddress].approvalVotes.length;
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy() external payable {}

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees() external pure {}

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay() external pure {}

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund(address airlineAddress, uint256 amount)
        external
        requireIsOperational
        requireIsAirlineRegistered(airlineAddress)
    {
        airlines[airlineAddress].isFunded = true;
        airlines[airlineAddress].funds = airlines[airlineAddress].funds.add(
            amount
        );
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {
        //fund();
    }
}
