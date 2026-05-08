/// <summary>
/// Drives the player character: physics movement via Rigidbody2D, virtual joystick input
/// from Unity Input System, 4-directional Animator state, and harvest interaction.
/// The harvest loop uses a CircleCollider2D trigger on the "Harvestable" layer mask.
/// Delegates inventory mutation to InventorySystem — no direct item logic here.
/// Requires: Rigidbody2D, Animator, and a child GameObject with a CircleCollider2D trigger
/// tagged "HarvestRadius".
/// </summary>

using System.Collections.Generic;
using Herbalis.Core;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Herbalis.Core
{
    [RequireComponent(typeof(Rigidbody2D), typeof(Animator))]
    public class CharacterController2D : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField] private float moveSpeed = 4f;

        [Header("Harvest")]
        [SerializeField] private float harvestRadius = 0.8f;
        [SerializeField] private LayerMask harvestableLayer;

        [Header("Dependencies")]
        [SerializeField] private InventorySystem inventory;

        // Animator parameter hashes — cheaper than string lookups each frame.
        private static readonly int HashMoveX    = Animator.StringToHash("MoveX");
        private static readonly int HashMoveY    = Animator.StringToHash("MoveY");
        private static readonly int HashIsMoving = Animator.StringToHash("IsMoving");

        private Rigidbody2D _rb;
        private Animator    _animator;
        private Vector2     _moveInput;

        // Tracks overlapping harvestables so we only harvest newly-entered ones.
        private readonly HashSet<HarvestableObject> _inRange = new();

        // --- Unity Input System callbacks (wired via PlayerInput component) ---

        public void OnMove(InputValue value)
        {
            _moveInput = value.Get<Vector2>();
        }

        public void OnInteract(InputValue value)
        {
            if (!value.isPressed) return;
            HarvestAll();
        }

        // --- MonoBehaviour lifecycle ---

        private void Awake()
        {
            _rb       = GetComponent<Rigidbody2D>();
            _animator = GetComponent<Animator>();
        }

        private void FixedUpdate()
        {
            Move();
        }

        private void Update()
        {
            UpdateAnimator();
        }

        // --- Movement ---

        private void Move()
        {
            _rb.linearVelocity = _moveInput * moveSpeed;
        }

        private void UpdateAnimator()
        {
            bool isMoving = _moveInput.sqrMagnitude > 0.01f;
            _animator.SetBool(HashIsMoving, isMoving);

            if (isMoving)
            {
                _animator.SetFloat(HashMoveX, _moveInput.x);
                _animator.SetFloat(HashMoveY, _moveInput.y);
            }
        }

        // --- Harvest ---

        /// <summary>
        /// Checks all harvestables within radius and attempts to harvest each available one.
        /// Uses Physics2D.OverlapCircleNonAlloc to avoid allocations on mobile.
        /// </summary>
        private void HarvestAll()
        {
            Collider2D[] hits = new Collider2D[8];
            int count = Physics2D.OverlapCircleNonAlloc(transform.position, harvestRadius, hits, harvestableLayer);

            for (int i = 0; i < count; i++)
            {
                if (!hits[i].TryGetComponent(out HarvestableObject harvestable)) continue;

                if (harvestable.TryHarvest(out var item, out int amount))
                {
                    inventory?.AddItem(item, amount);
                }
            }
        }

#if UNITY_EDITOR
        private void OnDrawGizmosSelected()
        {
            Gizmos.color = new Color(0.2f, 1f, 0.4f, 0.3f);
            Gizmos.DrawWireSphere(transform.position, harvestRadius);
        }
#endif
    }
}
